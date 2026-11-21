import { DEFAULT_PANEL_LENGTH, DEFAULT_PANEL_WIDTH, type LayoutSettings, type PanelStock } from './model'
import { formatMm, type Tenths } from './units'

/** Deux matériaux qui ne diffèrent que par les majuscules ou les espaces autour sont le même. */
export function materialKey(material: string): string {
  return material.trim().toLocaleLowerCase('fr')
}

/** Un groupe : un matériau et une épaisseur de panneau. */
export function stockKey(material: string, thickness: Tenths): string {
  return `${thickness}|${materialKey(material)}`
}

/** Le nom d'un groupe dans les messages : `« Chêne », 18 mm` ou `sans matériau, 18 mm`. */
export function groupLabel(material: string, thickness: Tenths): string {
  const name = material.trim()
  return `${name ? `« ${name} »` : 'sans matériau'}, ${formatMm(thickness)} mm`
}

export interface ResolvedStock extends PanelStock {
  /** Vrai si l'utilisateur n'a pas réglé ce panneau. */
  isDefault: boolean
}

/** Le panneau d'un groupe : celui que l'utilisateur a réglé, sinon le panneau par défaut, sans chant ni prix. */
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
    edgeThickness: 0,
    panelPrice: null,
    edgePrice: null,
    isDefault: true
  }
}
