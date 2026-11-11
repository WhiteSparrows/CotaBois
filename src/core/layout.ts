import { computeCutList, materialKey } from './cutList'
import { iterationsFor, packPanels, type CutDirection, type PackedPanel } from './guillotine'
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

// --- Résultat, toujours recalculé ---

export interface LayoutRect {
  x: Tenths
  y: Tenths
  sizeX: Tenths
  sizeY: Tenths
}

export interface LayoutPlacement extends LayoutRect {
  rotated: boolean
  /** Les noms distincts des pièces posées à cet endroit, sur tous les panneaux regroupés. */
  names: string[]
  pieceIds: string[]
  plan: number | null
}

export interface LayoutCut {
  order: number
  direction: CutDirection
  at: Tenths
  from: Tenths
  to: Tenths
  offset: Tenths
  trim: boolean
  kerfBefore: boolean
}

export interface LaidOutPanel {
  quantity: number
  placements: LayoutPlacement[]
  offcuts: LayoutRect[]
  cuts: LayoutCut[]
  usedArea: number
}

export interface UnplacedPiece {
  pieceId: string
  name: string
  length: Tenths
  width: Tenths
  /** `grain` : elle rentrerait si elle pouvait être tournée. */
  reason: 'too-large' | 'grain'
}

export interface LayoutGroup {
  material: string
  thickness: Tenths
  stock: ResolvedStock
  panelCount: number
  pieceCount: number
  placedCount: number
  usedArea: number
  panelArea: number
  panels: LaidOutPanel[]
  unplaced: UnplacedPiece[]
}

export interface Layout {
  groups: LayoutGroup[]
  complete: boolean
}

/** Taux d'utilisation arrondi à la décimale inférieure : `100 %` n'est annoncé que pour un panneau plein. */
export function formatUsage(usedArea: number, panelArea: number): string {
  if (panelArea <= 0) return '0 %'
  const tenths = Math.floor((usedArea * 1000) / panelArea)
  const integer = Math.floor(tenths / 10)
  const decimal = tenths % 10
  return decimal === 0 ? `${integer} %` : `${integer},${decimal} %`
}

/** Quatre coupes de délignage : le trait de scie tombe toujours du côté de la marge. */
function trimCuts(length: Tenths, width: Tenths, margin: Tenths): Omit<LayoutCut, 'order'>[] {
  if (margin === 0) return []
  const trim = { trim: true }
  return [
    { ...trim, direction: 'along', at: margin, from: 0, to: length, offset: margin, kerfBefore: true },
    { ...trim, direction: 'along', at: width - margin, from: 0, to: length, offset: width - 2 * margin, kerfBefore: false },
    { ...trim, direction: 'across', at: margin, from: margin, to: width - margin, offset: margin, kerfBefore: true },
    { ...trim, direction: 'across', at: length - margin, from: margin, to: width - margin, offset: length - 2 * margin, kerfBefore: false }
  ]
}

interface PieceRef {
  id: string
  name: string
  plan: number | null
}

/** Le panneau dans le repère du panneau complet, marge comprise, et ses coupes numérotées. */
function toPanel(packed: PackedPanel, pieces: readonly PieceRef[], length: Tenths, width: Tenths, margin: Tenths): LaidOutPanel {
  const shift = <T extends LayoutRect>(rect: T): T => ({ ...rect, x: rect.x + margin, y: rect.y + margin })
  const placements = packed.placements
    .map((placement) => {
      const piece = pieces[placement.index]!
      const { index: _index, ...rect } = placement
      return { ...shift(rect), names: [piece.name], pieceIds: [piece.id], plan: piece.plan }
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const cuts = [
    ...trimCuts(length, width, margin),
    ...packed.cuts.map((cut) => ({ ...cut, at: cut.at + margin, from: cut.from + margin, to: cut.to + margin, trim: false, kerfBefore: false }))
  ].map((cut, index) => ({ order: index + 1, ...cut }))
  return {
    quantity: 1,
    placements,
    offcuts: packed.offcuts.map(shift),
    cuts,
    usedArea: placements.reduce((sum, placement) => sum + placement.sizeX * placement.sizeY, 0)
  }
}

/** Deux panneaux identiques : mêmes positions, cotes, rotations, plans et coupes, quels que soient les noms. */
function signature(panel: LaidOutPanel): string {
  return JSON.stringify([panel.placements.map(({ x, y, sizeX, sizeY, rotated, plan }) => [x, y, sizeX, sizeY, rotated, plan]), panel.cuts])
}

function mergeIdentical(panels: readonly LaidOutPanel[]): LaidOutPanel[] {
  const merged = new Map<string, LaidOutPanel>()
  for (const panel of panels) {
    const key = signature(panel)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, panel)
      continue
    }
    existing.quantity += 1
    panel.placements.forEach((placement, index) => {
      const target = existing.placements[index]!
      target.pieceIds.push(...placement.pieceIds)
      for (const name of placement.names) if (!target.names.includes(name)) target.names.push(name)
    })
  }
  return [...merged.values()].sort((a, b) => b.usedArea - a.usedArea)
}

/** Calcule le calepinage du meuble : un groupe par matériau et épaisseur, dans l'ordre des totaux. */
export function computeLayout(project: Project): Layout {
  const { lines, totals } = computeCutList(project)
  const planOf = new Map<string, number>()
  for (const line of lines) if (line.plan !== null) for (const id of line.pieceIds) planOf.set(id, line.plan)

  const { kerf, edgeMargin: margin } = project.layout
  const runs = iterationsFor(project.pieces.length)
  const groups: LayoutGroup[] = []

  for (const total of totals) {
    const key = stockKey(total.material, total.thickness)
    const pieces = project.pieces.filter((piece) => stockKey(piece.material, piece.thickness) === key)
    const stock = resolveStock(project.layout, total.material, total.thickness)
    const usable = { sizeX: stock.length - 2 * margin, sizeY: stock.width - 2 * margin }
    const items = pieces.map((piece) => ({ sizeX: piece.shape.length, sizeY: piece.shape.width }))
    const refs = pieces.map((piece) => ({ id: piece.id, name: piece.name, plan: planOf.get(piece.id) ?? null }))

    const result =
      usable.sizeX > 0 && usable.sizeY > 0
        ? packPanels(items, usable, { kerf, rotate: !stock.grain, runs })
        : { panels: [], unplaced: items.map((_item, index) => index) }
    const panels = mergeIdentical(result.panels.map((packed) => toPanel(packed, refs, stock.length, stock.width, margin)))

    const unplaced = result.unplaced.map((index): UnplacedPiece => {
      const piece = pieces[index]!
      const { length, width } = piece.shape
      const fitsTurned = width <= usable.sizeX && length <= usable.sizeY
      return { pieceId: piece.id, name: piece.name, length, width, reason: stock.grain && fitsTurned ? 'grain' : 'too-large' }
    })
    const panelCount = panels.reduce((sum, panel) => sum + panel.quantity, 0)
    groups.push({
      material: total.material,
      thickness: total.thickness,
      stock,
      panelCount,
      pieceCount: pieces.length,
      placedCount: pieces.length - unplaced.length,
      usedArea: panels.reduce((sum, panel) => sum + panel.usedArea * panel.quantity, 0),
      panelArea: panelCount * stock.length * stock.width,
      panels,
      unplaced
    })
  }

  return { groups, complete: groups.every((group) => group.unplaced.length === 0) }
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
