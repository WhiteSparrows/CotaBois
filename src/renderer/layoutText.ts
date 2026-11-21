import { formatUsage, groupLabel, type LayoutGroup, type LayoutPlacement, type UnplacedPiece } from '../core/layout'
import type { Cost, CostItem } from '../core/cost'
import { formatEuros, formatMeters, formatMm } from '../core/units'

export const NO_MINIMUM_GUARANTEE = 'Le logiciel cherche le plus petit nombre de panneaux, sans garantir que ce soit le minimum.'

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

export function groupTitle(group: LayoutGroup): string {
  const label = groupLabel(group.material, group.thickness)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function stockSize(group: LayoutGroup): string {
  return `${formatMm(group.stock.length)} × ${formatMm(group.stock.width)}`
}

export function groupSummary(group: LayoutGroup): { panels: string; usage: string; pieces: string; edges: string } {
  return {
    panels: `${plural(group.panelCount, 'panneau', 'panneaux')} de ${stockSize(group)} mm`,
    usage: `Utilisation : ${formatUsage(group.usedArea, group.panelArea)}`,
    pieces: `${plural(group.placedCount, 'pièce')} sur ${group.pieceCount}`,
    edges: group.edgeCount > 0 ? `Chant : ${edgeMeters(group)}` : ''
  }
}

/** `7,56 m (7 bords)` */
export function edgeMeters(group: Pick<LayoutGroup, 'edgeCount' | 'edgeLength'>): string {
  return `${formatMeters(group.edgeLength)} (${plural(group.edgeCount, 'bord')})`
}

/** `Panneau 2 sur 3`, `Panneaux 2 et 3 sur 3 (× 2)` ou `Panneaux 1 à 4 sur 4 (× 4)`. */
export function panelTitle(first: number, quantity: number, total: number): string {
  if (quantity === 1) return `Panneau ${first} sur ${total}`
  const last = first + quantity - 1
  const range = quantity === 2 ? `${first} et ${last}` : `${first} à ${last}`
  return `Panneaux ${range} sur ${total} (× ${quantity})`
}

/** Les cotes de la pièce elle-même, longueur d'abord, quelle que soit sa position sur le panneau. */
export function pieceSize(placement: LayoutPlacement): string {
  const [length, width] = placement.rotated ? [placement.sizeY, placement.sizeX] : [placement.sizeX, placement.sizeY]
  return `${formatMm(length)} × ${formatMm(width)}`
}

export function placementDetail(placement: LayoutPlacement): string {
  return `${pieceSize(placement)}${placement.rotated ? ' ↻' : ''}${placement.plan !== null ? ` · Plan ${placement.plan}` : ''}`
}

export function unplacedText(piece: UnplacedPiece): string {
  const size = `${formatMm(piece.length)} × ${formatMm(piece.width)} mm`
  const reason =
    piece.reason === 'grain'
      ? 'ne rentre que tournée : désactivez le sens du fil, ou inversez sa longueur et sa largeur'
      : 'trop grande pour ce panneau'
  return `${piece.name} (${size}) : ${reason}`
}

/** `panneaux sans matériau, 18 mm` ou `chant « Chêne », 18 mm` */
export function costLabel(item: CostItem): string {
  return `${item.kind === 'panels' ? 'panneaux' : 'chant'} ${groupLabel(item.material, item.thickness)}`
}

export function costQuantity(item: CostItem): string {
  return item.kind === 'panels' ? plural(item.quantity, 'panneau', 'panneaux') : formatMeters(item.quantity * 100)
}

export function costUnitPrice(item: CostItem): string {
  if (item.unitPrice === null) return 'prix manquant'
  return item.kind === 'panels' ? `${formatEuros(item.unitPrice)} le panneau` : `${formatEuros(item.unitPrice)} le mètre`
}

/** `Total 64,33 €`, ou `Total partiel 52,33 €` s'il manque un prix. */
export function costTotal(cost: Cost): string {
  return `${cost.complete ? 'Total' : 'Total partiel'} ${formatEuros(cost.total)}`
}

export function costMissing(cost: Cost): string {
  const missing = cost.items.filter((item) => item.amount === null).map(costLabel)
  return missing.length > 0 ? `Prix manquant : ${missing.join(' ; ')}` : ''
}

/** Un prix en euros pour un champ : `45,90`, ou vide s'il n'est pas saisi. */
export function priceField(cents: number | null): string {
  return cents === null ? '' : formatEuros(cents).replace(/\u00a0€$/, '').replaceAll('\u00a0', ' ')
}

/** Vrai dès qu'un prix est saisi : sinon, le coût n'est pas affiché. */
export function hasAnyPrice(panels: ReadonlyArray<{ panelPrice: number | null; edgePrice: number | null }>): boolean {
  return panels.some((panel) => panel.panelPrice !== null || panel.edgePrice !== null)
}

/** La première lettre en capitale, pour un début de ligne de tableau. */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
