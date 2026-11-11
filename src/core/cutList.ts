import { shapeExtent, type Piece, type Project, type ShapedShape } from './model'
import { canonicalShapeKey } from './shape'
import type { Tenths } from './units'

export interface CutLine {
  quantity: number
  pieceIds: string[]
  names: string[]
  length: Tenths
  width: Tenths
  thickness: Tenths
  material: string
  /** Identique pour deux formes égales à une rotation ou un retournement près ; vide pour un rectangle. */
  shapeKey: string
  /** La forme de la première pièce de la ligne, ou `null` pour un rectangle. */
  shape: ShapedShape | null
  /** Numéro du plan dans le PDF, ou `null` pour un rectangle. */
  plan: number | null
}

export interface CutTotal {
  material: string
  thickness: Tenths
  pieceCount: number
  /** Somme de longueur × largeur, en dixièmes de mm au carré. */
  area: number
}

export interface CutList {
  lines: CutLine[]
  totals: CutTotal[]
}

/** Deux matériaux qui ne diffèrent que par les majuscules ou les espaces autour sont le même. */
export function materialKey(material: string): string {
  return material.trim().toLocaleLowerCase('fr')
}

function compareMaterials(a: string, b: string): number {
  return materialKey(a).localeCompare(materialKey(b), 'fr')
}

/** La longueur est toujours la plus grande des deux dimensions, quelle que soit la saisie. */
function cutDimensions(piece: Piece): { length: Tenths; width: Tenths } {
  const { length, width } = shapeExtent(piece.shape)
  return { length: Math.max(length, width), width: Math.min(length, width) }
}

export function computeCutList(project: Project): CutList {
  const lines = new Map<string, CutLine>()
  const totals = new Map<string, CutTotal>()

  for (const piece of project.pieces) {
    const { length, width } = cutDimensions(piece)
    const { thickness } = piece
    const material = piece.material.trim()
    const totalKey = `${thickness}|${materialKey(material)}`
    const shapeKey = canonicalShapeKey(piece.shape)
    const lineKey = `${length}|${width}|${totalKey}|${shapeKey}`

    const line = lines.get(lineKey)
    if (line) {
      line.quantity += 1
      line.pieceIds.push(piece.id)
      if (!line.names.includes(piece.name)) line.names.push(piece.name)
    } else {
      lines.set(lineKey, {
        quantity: 1,
        pieceIds: [piece.id],
        names: [piece.name],
        length,
        width,
        thickness,
        material,
        shapeKey,
        shape: piece.shape.kind === 'shaped' ? piece.shape : null,
        plan: null
      })
    }

    const total = totals.get(totalKey) ?? { material, thickness, pieceCount: 0, area: 0 }
    total.pieceCount += 1
    total.area += length * width
    totals.set(totalKey, total)
  }

  const sortedLines = [...lines.values()].sort(
    (a, b) =>
      compareMaterials(a.material, b.material) ||
      b.thickness - a.thickness ||
      b.length - a.length ||
      b.width - a.width ||
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
