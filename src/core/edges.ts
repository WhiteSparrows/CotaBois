import { EDGE_NAMES, type EdgeName, type LayoutSettings, type Piece, type Project } from './model'
import { err, ok, type Result } from './result'
import { resolveStock } from './stock'
import { formatMm, type Tenths } from './units'

/** Les chants d'une pièce : bords, cote à couper et métrage. */

export const EDGE_LABELS: Record<EdgeName, string> = {
  bottom: 'Bord bas',
  top: 'Bord haut',
  left: 'Bord gauche',
  right: 'Bord droit'
}

/** Rangés dans l'ordre de `EDGE_NAMES`, sans doublon ; `undefined` sans chant. */
export function normalizeEdges(edges: readonly EdgeName[]): EdgeName[] | undefined {
  const banded = new Set(edges)
  const ordered = EDGE_NAMES.filter((edge) => banded.has(edge))
  return ordered.length > 0 ? ordered : undefined
}

/** La pièce avec ces chants, sans champ `edges` s'il n'y en a aucun. */
export function withEdges(piece: Piece, edges: readonly EdgeName[]): Piece {
  const { edges: _previous, ...rest } = piece
  const normalized = normalizeEdges(edges)
  return normalized ? { ...rest, edges: normalized } : rest
}

/** La cote finie moins l'épaisseur du chant de chaque bord qui la borne. */
export function cutSize(piece: Pick<Piece, 'shape' | 'edges'>, edgeThickness: Tenths): { length: Tenths; width: Tenths } {
  const edges = piece.edges ?? []
  const count = (names: readonly EdgeName[]) => edges.filter((edge) => names.includes(edge)).length
  return {
    length: piece.shape.length - edgeThickness * count(['left', 'right']),
    width: piece.shape.width - edgeThickness * count(['bottom', 'top'])
  }
}

/** L'épaisseur du chant du groupe de la pièce, 0 sans réglage. */
export function pieceEdgeThickness(settings: LayoutSettings, piece: Piece): Tenths {
  return resolveStock(settings, piece.material, piece.thickness).edgeThickness
}

export function pieceCutSize(piece: Piece, settings: LayoutSettings): { length: Tenths; width: Tenths } {
  return cutSize(piece, pieceEdgeThickness(settings, piece))
}

/** Refuse, en nommant la pièce, toute cote à couper inférieure à 0,1 mm. */
export function checkCutSizes(project: Project, pieceIds?: readonly string[]): Result<null> {
  const wanted = pieceIds ? new Set(pieceIds) : null
  for (const piece of project.pieces) {
    if (wanted && !wanted.has(piece.id)) continue
    const thickness = pieceEdgeThickness(project.layout, piece)
    const { length, width } = cutSize(piece, thickness)
    if (length < 1 || width < 1) {
      return err(
        'invalid-edges',
        `« ${piece.name} » : avec un chant de ${formatMm(thickness)} mm sur ses bords, il ne resterait rien à couper.`,
        'edges'
      )
    }
  }
  return ok(null)
}

function isLong(edge: EdgeName, length: Tenths, width: Tenths): boolean {
  const alongLength = edge === 'bottom' || edge === 'top'
  return length >= width ? alongLength : !alongLength
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`
}

/** `2 longs, 1 court`, ou `3 bords` pour un carré ; vide sans chant. */
export function edgeSummary(edges: readonly EdgeName[] | undefined, length: Tenths, width: Tenths): string {
  const banded = edges ?? []
  if (banded.length === 0) return ''
  if (length === width) return plural(banded.length, 'bord')
  const longs = banded.filter((edge) => isLong(edge, length, width)).length
  const shorts = banded.length - longs
  return [longs > 0 ? plural(longs, 'long') : '', shorts > 0 ? plural(shorts, 'court') : ''].filter(Boolean).join(', ')
}

/** Les côtés finis chantés, chacun avec sa surlongueur. */
export function edgeLength(piece: Pick<Piece, 'shape' | 'edges'>, overhang: Tenths): Tenths {
  return (piece.edges ?? []).reduce(
    (sum, edge) => sum + (edge === 'bottom' || edge === 'top' ? piece.shape.length : piece.shape.width) + overhang,
    0
  )
}
