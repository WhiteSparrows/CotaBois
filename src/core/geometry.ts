import {
  axisOf,
  shapeExtent,
  type Axis,
  type CornerName,
  type Piece,
  type Project,
  type ShapedShape,
  type SignedAxis,
  type Vector
} from './model'
import { cornerSize, resolveCutout, shapeContains } from './shape'

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

export interface PieceFrame {
  /** Le point (u = 0, v = 0, épaisseur = 0) de la pièce, dans le repère du meuble. */
  origin: Vector
  u: Vector
  v: Vector
  /** u × v : le repère est direct, et l'épaisseur s'étend le long de ce vecteur. */
  normal: Vector
}

function axisVector(signedAxis: SignedAxis): Vector {
  const vector: Vector = { x: 0, y: 0, z: 0 }
  vector[axisOf(signedAxis)] = signedAxis.startsWith('+') ? 1 : -1
  return vector
}

/** Le repère propre d'une pièce, où se décrit sa forme. */
export function pieceFrame(piece: Piece): PieceFrame {
  const u = axisVector(piece.orientation.u)
  const v = axisVector(piece.orientation.v)
  const normal: Vector = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x
  }
  const size = pieceSize(piece)
  // Un axe négatif part de l'autre face de l'encombrement.
  const origin = { ...piece.position }
  for (const axis of AXES) {
    if (u[axis] + v[axis] + normal[axis] < 0) origin[axis] += size[axis]
  }
  return { origin, u, v, normal }
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

/** Au plus 1 mm entre deux plans sur une partie courbe, et 32 plans par courbe. */
const CURVE_MIN_STEP = 10
const CURVE_MAX_STEPS = 32

function addPlanes(planes: number[], from: number, to: number, curved: boolean): void {
  planes.push(from, to)
  if (!curved) return
  const step = Math.max(CURVE_MIN_STEP, (to - from) / CURVE_MAX_STEPS)
  for (let value = from + step; value < to; value += step) planes.push(value)
}

/** Les coordonnées, dans le plan de la pièce, où sa forme change. */
function featurePlanes(shape: ShapedShape): { u: number[]; v: number[] } {
  const u: number[] = []
  const v: number[] = []

  const corners: Array<[CornerName, boolean, boolean]> = [
    ['bottomLeft', true, true],
    ['bottomRight', false, true],
    ['topRight', false, false],
    ['topLeft', true, false]
  ]
  for (const [corner, isLeft, isBottom] of corners) {
    const size = cornerSize(shape.corners[corner])
    if (size === 0) continue
    addPlanes(u, isLeft ? 0 : shape.length - size, isLeft ? size : shape.length, true)
    addPlanes(v, isBottom ? 0 : shape.width - size, isBottom ? size : shape.width, true)
  }

  for (const cutout of shape.cutouts) {
    const box = resolveCutout(shape, cutout)
    if (box.kind === 'circle') {
      addPlanes(u, box.minU, box.maxU, true)
      addPlanes(v, box.minV, box.maxV, true)
      continue
    }
    const r = box.cornerRadius
    addPlanes(u, box.minU, box.minU + r, r > 0)
    addPlanes(u, box.maxU - r, box.maxU, r > 0)
    addPlanes(v, box.minV, box.minV + r, r > 0)
    addPlanes(v, box.maxV - r, box.maxV, r > 0)
  }
  return { u, v }
}

function addWorldPlanes(planes: Record<Axis, number[]>, piece: Piece): void {
  if (piece.shape.kind === 'rectangle') return
  const frame = pieceFrame(piece)
  const features = featurePlanes(piece.shape)
  const axisU = axisOf(piece.orientation.u)
  const axisV = axisOf(piece.orientation.v)
  for (const value of features.u) planes[axisU].push(frame.origin[axisU] + value * frame.u[axisU])
  for (const value of features.v) planes[axisV].push(frame.origin[axisV] + value * frame.v[axisV])
}

function pieceContains(piece: Piece, frame: PieceFrame, point: Vector): boolean {
  const dot = (axis: Vector) =>
    (point.x - frame.origin.x) * axis.x + (point.y - frame.origin.y) * axis.y + (point.z - frame.origin.z) * axis.z
  return shapeContains(piece.shape, dot(frame.u), dot(frame.v))
}

function cellsAlong(planes: number[], min: number, max: number): number[] {
  const inside = planes.filter((value) => value > min && value < max)
  const sorted = [...new Set([min, max, ...inside])].sort((a, b) => a - b)
  return sorted.slice(1).map((value, index) => (value + sorted[index]!) / 2)
}

/**
 * Les deux encombrements se recoupent : on cherche de la matière commune, cellule par cellule. Les bords
 * droits tombent sur des plans de la grille, donc le résultat y est exact ; sur une courbe, il l'est à 1 mm près.
 */
function solidsOverlap(a: Piece, b: Piece, boundsA: Bounds, boundsB: Bounds): boolean {
  if (a.shape.kind === 'rectangle' && b.shape.kind === 'rectangle') return true

  const planes: Record<Axis, number[]> = { x: [], y: [], z: [] }
  addWorldPlanes(planes, a)
  addWorldPlanes(planes, b)

  const min = (axis: Axis) => Math.max(boundsA.min[axis], boundsB.min[axis])
  const max = (axis: Axis) => Math.min(boundsA.max[axis], boundsB.max[axis])
  const frameA = pieceFrame(a)
  const frameB = pieceFrame(b)

  for (const x of cellsAlong(planes.x, min('x'), max('x'))) {
    for (const y of cellsAlong(planes.y, min('y'), max('y'))) {
      for (const z of cellsAlong(planes.z, min('z'), max('z'))) {
        const point = { x, y, z }
        if (pieceContains(a, frameA, point) && pieceContains(b, frameB, point)) return true
      }
    }
  }
  return false
}

export function findOverlaps(project: Project): Array<[string, string]> {
  const bounds = project.pieces.map(pieceBounds)
  const pairs: Array<[string, string]> = []
  project.pieces.forEach((a, i) => {
    for (let j = i + 1; j < project.pieces.length; j++) {
      const b = project.pieces[j]!
      if (boundsOverlap(bounds[i]!, bounds[j]!) && solidsOverlap(a, b, bounds[i]!, bounds[j]!)) pairs.push([a.id, b.id])
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
