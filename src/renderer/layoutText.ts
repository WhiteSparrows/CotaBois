import { formatUsage, groupLabel, type LayoutGroup, type LayoutPlacement, type UnplacedPiece } from '../core/layout'
import { formatMm } from '../core/units'

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

export function groupSummary(group: LayoutGroup): { panels: string; usage: string; pieces: string } {
  return {
    panels: `${plural(group.panelCount, 'panneau', 'panneaux')} de ${stockSize(group)} mm`,
    usage: `Utilisation : ${formatUsage(group.usedArea, group.panelArea)}`,
    pieces: `${plural(group.placedCount, 'pièce')} sur ${group.pieceCount}`
  }
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
