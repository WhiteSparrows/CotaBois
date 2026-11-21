import { edgeLength, edgeSummary, pieceCutSize } from './edges'
import type { Piece, Project, ShapedShape } from './model'
import { canonicalPieceKey } from './shape'
import { materialKey } from './stock'
import type { Tenths } from './units'

export { materialKey }

export interface CutLine {
  quantity: number
  pieceIds: string[]
  names: string[]
  /** La cote à couper : la cote finie moins les chants. La plus grande cote finie d'abord. */
  length: Tenths
  width: Tenths
  /** La cote finie, dans la même orientation. */
  finishedLength: Tenths
  finishedWidth: Tenths
  thickness: Tenths
  material: string
  /** Identique pour deux pièces dont la forme et les chants sont égaux à une rotation ou un retournement près. */
  shapeKey: string
  /** La forme de la première pièce de la ligne, ou `null` pour un rectangle. */
  shape: ShapedShape | null
  /** Numéro du plan dans le PDF, ou `null` pour un rectangle. */
  plan: number | null
  /** Résumé des chants, par exemple `2 longs, 1 court` ; vide sans chant. */
  edges: string
  /** Métrage de chant de la ligne, toutes pièces et surlongueurs comprises. */
  edgeLength: Tenths
}

export interface CutTotal {
  material: string
  thickness: Tenths
  pieceCount: number
  /** Somme des cotes à couper, longueur × largeur, en dixièmes de mm au carré. */
  area: number
  /** Nombre de bords chantés du groupe. */
  edgeCount: number
  /** Métrage du chant du groupe, surlongueurs comprises. */
  edgeLength: Tenths
}

export interface CutList {
  lines: CutLine[]
  totals: CutTotal[]
}

function compareMaterials(a: string, b: string): number {
  return materialKey(a).localeCompare(materialKey(b), 'fr')
}

/** La plus grande cote finie est la longueur, quelle que soit la saisie ; la cote à couper suit la même orientation. */
function lineDimensions(piece: Piece, project: Project) {
  const cut = pieceCutSize(piece, project.layout)
  const { length, width } = piece.shape
  return length >= width
    ? { length: cut.length, width: cut.width, finishedLength: length, finishedWidth: width }
    : { length: cut.width, width: cut.length, finishedLength: width, finishedWidth: length }
}

export function computeCutList(project: Project): CutList {
  const lines = new Map<string, CutLine>()
  const totals = new Map<string, CutTotal>()
  const overhang = project.layout.edgeOverhang

  for (const piece of project.pieces) {
    const dimensions = lineDimensions(piece, project)
    const { thickness } = piece
    const material = piece.material.trim()
    const totalKey = `${thickness}|${materialKey(material)}`
    const shapeKey = canonicalPieceKey(piece.shape, piece.edges)
    const lineKey = `${dimensions.finishedLength}|${dimensions.finishedWidth}|${totalKey}|${shapeKey}`
    const banded = edgeLength(piece, overhang)

    const line = lines.get(lineKey)
    if (line) {
      line.quantity += 1
      line.pieceIds.push(piece.id)
      line.edgeLength += banded
      if (!line.names.includes(piece.name)) line.names.push(piece.name)
    } else {
      lines.set(lineKey, {
        quantity: 1,
        pieceIds: [piece.id],
        names: [piece.name],
        ...dimensions,
        thickness,
        material,
        shapeKey,
        shape: piece.shape.kind === 'shaped' ? piece.shape : null,
        plan: null,
        edges: edgeSummary(piece.edges, piece.shape.length, piece.shape.width),
        edgeLength: banded
      })
    }

    const total = totals.get(totalKey) ?? { material, thickness, pieceCount: 0, area: 0, edgeCount: 0, edgeLength: 0 }
    total.pieceCount += 1
    total.area += dimensions.length * dimensions.width
    total.edgeCount += piece.edges?.length ?? 0
    total.edgeLength += banded
    totals.set(totalKey, total)
  }

  const sortedLines = [...lines.values()].sort(
    (a, b) =>
      compareMaterials(a.material, b.material) ||
      b.thickness - a.thickness ||
      b.finishedLength - a.finishedLength ||
      b.finishedWidth - a.finishedWidth ||
      a.shapeKey.localeCompare(b.shapeKey)
  )
  let plan = 0
  for (const line of sortedLines) {
    if (line.shape) line.plan = ++plan
  }

  return {
    lines: sortedLines,
    totals: [...totals.values()].sort(
      (a, b) => compareMaterials(a.material, b.material) || b.thickness - a.thickness
    )
  }
}
