import { shapeExtent, type Piece, type Project } from './model'
import type { Tenths } from './units'

export interface CutLine {
  quantity: number
  pieceIds: string[]
  names: string[]
  length: Tenths
  width: Tenths
  thickness: Tenths
  material: string
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

function materialKey(material: string): string {
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
    const lineKey = `${length}|${width}|${totalKey}`

    const line = lines.get(lineKey)
    if (line) {
      line.quantity += 1
      line.pieceIds.push(piece.id)
      if (!line.names.includes(piece.name)) line.names.push(piece.name)
    } else {
      lines.set(lineKey, { quantity: 1, pieceIds: [piece.id], names: [piece.name], length, width, thickness, material })
    }

    const total = totals.get(totalKey) ?? { material, thickness, pieceCount: 0, area: 0 }
    total.pieceCount += 1
    total.area += length * width
    totals.set(totalKey, total)
  }

  return {
    lines: [...lines.values()].sort(
      (a, b) =>
        compareMaterials(a.material, b.material) ||
        b.thickness - a.thickness ||
        b.length - a.length ||
        b.width - a.width
    ),
    totals: [...totals.values()].sort(
      (a, b) => compareMaterials(a.material, b.material) || b.thickness - a.thickness
    )
  }
}
