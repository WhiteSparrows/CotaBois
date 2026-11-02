import { axisOf, shapeExtent, type Axis, type Piece, type Project, type Vector } from './model'

const AXES: readonly Axis[] = ['x', 'y', 'z']

/** 5 mm, en dixièmes. */
export const DEFAULT_SNAP_THRESHOLD = 50

export interface Bounds {
  min: Vector
  max: Vector
}

export interface ProjectBounds extends Bounds {
  size: Vector
}

/** Encombrement d'une pièce sur chaque axe du meuble. */
export function pieceSize(piece: Piece): Vector {
  const { length, width } = shapeExtent(piece.shape)
  const size: Vector = { x: piece.thickness, y: piece.thickness, z: piece.thickness }
  size[axisOf(piece.orientation.u)] = length
  size[axisOf(piece.orientation.v)] = width
  return size
}

export function pieceBounds(piece: Piece): Bounds {
  const size = pieceSize(piece)
  const { x, y, z } = piece.position
  return {
    min: { x, y, z },
    max: { x: x + size.x, y: y + size.y, z: z + size.z }
  }
}

export function projectBounds(project: Project): ProjectBounds | null {
  const [first, ...others] = project.pieces.map(pieceBounds)
  if (!first) return null

  const min = { ...first.min }
  const max = { ...first.max }
  for (const bounds of others) {
    for (const axis of AXES) {
      min[axis] = Math.min(min[axis], bounds.min[axis])
      max[axis] = Math.max(max[axis], bounds.max[axis])
    }
  }
  return {
    min,
    max,
    size: { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z }
  }
}

/** Le contact bord à bord n'est pas un chevauchement. */
export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return AXES.every((axis) => a.min[axis] < b.max[axis] && b.min[axis] < a.max[axis])
}

export function findOverlaps(project: Project): Array<[string, string]> {
  const bounds = project.pieces.map(pieceBounds)
  const pairs: Array<[string, string]> = []
  project.pieces.forEach((a, i) => {
    for (let j = i + 1; j < project.pieces.length; j++) {
      if (boundsOverlap(bounds[i]!, bounds[j]!)) pairs.push([a.id, project.pieces[j]!.id])
    }
  })
  return pairs
}

/** Aligne chaque face de la pièce sur la face voisine la plus proche, axe par axe. */
export function snapPosition(
  project: Project,
  pieceId: string,
  position: Vector,
  threshold: number = DEFAULT_SNAP_THRESHOLD
): Vector {
  const piece = project.pieces.find((candidate) => candidate.id === pieceId)
  if (!piece) return position

  const size = pieceSize(piece)
  const others = project.pieces.filter((candidate) => candidate.id !== pieceId).map(pieceBounds)
  const snapped = { ...position }

  for (const axis of AXES) {
    let best: number | null = null
    for (const other of others) {
      for (const face of [other.min[axis], other.max[axis]]) {
        for (const delta of [face - position[axis], face - (position[axis] + size[axis])]) {
          if (Math.abs(delta) <= threshold && (best === null || Math.abs(delta) < Math.abs(best))) {
            best = delta
          }
        }
      }
    }
    if (best !== null) snapped[axis] = position[axis] + best
  }
  return snapped
}
