import { materialKey } from './cutList'
import {
  DEFAULT_PANEL_LENGTH,
  DEFAULT_PANEL_WIDTH,
  defaultLayoutSettings,
  DIMENSION_RANGE,
  isValidDimension,
  MAX_MATERIAL,
  type LayoutSettings,
  type PanelStock,
  type Project
} from './model'
import { err, ok, type Result } from './result'
import { formatMm, type Tenths } from './units'

export { defaultLayoutSettings }

export const MAX_KERF = 200
export const MAX_EDGE_MARGIN = 1000

export interface LayoutOptionChanges {
  kerf?: Tenths
  edgeMargin?: Tenths
}

export type PanelStockChanges = Partial<Pick<PanelStock, 'length' | 'width' | 'grain'>>

export interface ResolvedStock extends PanelStock {
  /** Vrai si l'utilisateur n'a pas réglé ce panneau. */
  isDefault: boolean
}

function stockKey(material: string, thickness: Tenths): string {
  return `${thickness}|${materialKey(material)}`
}

/** Le nom d'un groupe dans les messages : `« Chêne », 18 mm` ou `sans matériau, 18 mm`. */
export function groupLabel(material: string, thickness: Tenths): string {
  const name = material.trim()
  return `${name ? `« ${name} »` : 'sans matériau'}, ${formatMm(thickness)} mm`
}

export function resolveStock(settings: LayoutSettings, material: string, thickness: Tenths): ResolvedStock {
  const key = stockKey(material, thickness)
  const saved = settings.panels.find((panel) => stockKey(panel.material, panel.thickness) === key)
  if (saved) return { ...saved, isDefault: false }
  return {
    material: material.trim(),
    thickness,
    length: DEFAULT_PANEL_LENGTH,
    width: DEFAULT_PANEL_WIDTH,
    grain: false,
    isDefault: true
  }
}

function sortPanels(panels: readonly PanelStock[]): PanelStock[] {
  return [...panels].sort(
    (a, b) => materialKey(a.material).localeCompare(materialKey(b.material), 'fr') || b.thickness - a.thickness
  )
}

function invalid<T>(message: string, field: string): Result<T> {
  return err('invalid-layout', message, field)
}

function isTenthsInRange(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max
}

function validateKerf(kerf: number): Result<Tenths> {
  return isTenthsInRange(kerf, MAX_KERF)
    ? ok(kerf)
    : invalid('Le trait de scie doit être compris entre 0 et 20 mm, à 0,1 mm près.', 'kerf')
}

function validateEdgeMargin(edgeMargin: number): Result<Tenths> {
  return isTenthsInRange(edgeMargin, MAX_EDGE_MARGIN)
    ? ok(edgeMargin)
    : invalid('La marge de bord doit être comprise entre 0 et 100 mm, à 0,1 mm près.', 'edgeMargin')
}

function validateStock(stock: PanelStock): Result<PanelStock> {
  const material = stock.material.trim()
  if (material.length > MAX_MATERIAL) {
    return invalid(`Le matériau ne peut pas dépasser ${MAX_MATERIAL} caractères.`, 'material')
  }
  if (!isValidDimension(stock.thickness)) return invalid(`L'épaisseur du panneau doit être ${DIMENSION_RANGE}.`, 'thickness')
  if (!isValidDimension(stock.length)) return invalid(`La longueur du panneau doit être ${DIMENSION_RANGE}.`, 'length')
  if (!isValidDimension(stock.width)) return invalid(`La largeur du panneau doit être ${DIMENSION_RANGE}.`, 'width')
  if (typeof stock.grain !== 'boolean') return invalid('Le sens du fil doit être respecté ou non.', 'grain')
  return ok({ ...stock, material })
}

/** La marge est retirée des quatre côtés : il doit rester une surface utile sur chaque panneau. */
function checkMargin(edgeMargin: Tenths, stocks: readonly PanelStock[]): Result<null> {
  for (const stock of stocks) {
    if (2 * edgeMargin >= stock.length || 2 * edgeMargin >= stock.width) {
      return invalid(
        `Une marge de bord de ${formatMm(edgeMargin)} mm ne laisse aucune surface utile sur le panneau ` +
          `${groupLabel(stock.material, stock.thickness)} (${formatMm(stock.length)} × ${formatMm(stock.width)} mm).`,
        'edgeMargin'
      )
    }
  }
  return ok(null)
}

/** Les panneaux enregistrés, et celui de chaque groupe présent dans le meuble. */
function stocksInUse(project: Project, settings: LayoutSettings): PanelStock[] {
  const stocks = new Map<string, PanelStock>()
  for (const panel of settings.panels) stocks.set(stockKey(panel.material, panel.thickness), panel)
  for (const piece of project.pieces) {
    const key = stockKey(piece.material, piece.thickness)
    if (!stocks.has(key)) stocks.set(key, resolveStock(settings, piece.material, piece.thickness))
  }
  return [...stocks.values()]
}

export function validateLayoutSettings(settings: LayoutSettings): Result<LayoutSettings> {
  const kerf = validateKerf(settings.kerf)
  if (!kerf.ok) return kerf
  const edgeMargin = validateEdgeMargin(settings.edgeMargin)
  if (!edgeMargin.ok) return edgeMargin

  const panels: PanelStock[] = []
  const keys = new Set<string>()
  for (const raw of settings.panels) {
    const stock = validateStock(raw)
    if (!stock.ok) return stock
    const key = stockKey(stock.value.material, stock.value.thickness)
    if (keys.has(key)) {
      return invalid(`Le panneau ${groupLabel(stock.value.material, stock.value.thickness)} est enregistré deux fois.`, 'panels')
    }
    keys.add(key)
    panels.push(stock.value)
  }
  const margin = checkMargin(settings.edgeMargin, panels)
  if (!margin.ok) return margin
  return ok({ kerf: settings.kerf, edgeMargin: settings.edgeMargin, panels: sortPanels(panels) })
}

/** Change le trait de scie ou la marge. Un caisson généré n'est pas marqué comme retouché. */
export function setLayoutOptions(project: Project, changes: LayoutOptionChanges): Result<Project> {
  const next: LayoutSettings = { ...project.layout, ...changes }
  const kerf = validateKerf(next.kerf)
  if (!kerf.ok) return kerf
  const edgeMargin = validateEdgeMargin(next.edgeMargin)
  if (!edgeMargin.ok) return edgeMargin
  const margin = checkMargin(next.edgeMargin, stocksInUse(project, next))
  if (!margin.ok) return margin
  return ok({ ...project, layout: next })
}

/** Crée ou modifie le panneau d'un matériau et d'une épaisseur. */
export function setPanelStock(project: Project, material: string, thickness: Tenths, changes: PanelStockChanges): Result<Project> {
  const key = stockKey(material, thickness)
  const saved = project.layout.panels.find((panel) => stockKey(panel.material, panel.thickness) === key)
  const { isDefault: _isDefault, ...base } = resolveStock(project.layout, material, thickness)
  const stock = validateStock({ ...base, ...changes, material: saved?.material ?? material.trim(), thickness })
  if (!stock.ok) return stock
  const margin = checkMargin(project.layout.edgeMargin, [stock.value])
  if (!margin.ok) return margin

  const others = project.layout.panels.filter((panel) => stockKey(panel.material, panel.thickness) !== key)
  return ok({ ...project, layout: { ...project.layout, panels: sortPanels([...others, stock.value]) } })
}
