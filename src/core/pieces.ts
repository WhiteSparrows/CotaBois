import { boundsOverlap, pieceBounds, pieceSize, projectBounds } from './geometry'
import {
  axisOf,
  MAX_PIECE_NAME,
  validatePiece,
  validateProjectName,
  type Axis,
  type Piece,
  type Project,
  type SignedAxis,
  type Vector
} from './model'
import { err, ok, type Result } from './result'
import type { Tenths } from './units'

export type PieceInput = Omit<Piece, 'id'>

export interface PieceChanges {
  name?: string
  length?: Tenths
  width?: Tenths
  thickness?: Tenths
  material?: string
  position?: Vector
}

const COPY_SUFFIX = ' (copie)'

/** Toute retouche d'une pièce détache le caisson de ses paramètres d'origine. */
function withPieces(project: Project, pieces: readonly Piece[]): Project {
  return {
    ...project,
    pieces,
    template: project.template && { ...project.template, customized: true }
  }
}

function findPiece(project: Project, pieceId: string): Result<Piece> {
  const piece = project.pieces.find((candidate) => candidate.id === pieceId)
  return piece ? ok(piece) : err('unknown-piece', 'Cette pièce n\'existe plus.')
}

function replacePiece(project: Project, piece: Piece): Project {
  return withPieces(
    project,
    project.pieces.map((candidate) => (candidate.id === piece.id ? piece : candidate))
  )
}

/** Un panneau à plat, posé au contact du meuble. */
export function newPanelInput(project: Project): PieceInput {
  const names = new Set(project.pieces.map((piece) => piece.name))
  let index = 1
  while (names.has(`Panneau ${index}`)) index++

  const bounds = projectBounds(project)
  return {
    name: `Panneau ${index}`,
    shape: { kind: 'rectangle', length: 6000, width: 3000 },
    thickness: 180,
    material: '',
    position: bounds ? { x: bounds.max.x, y: bounds.min.y, z: bounds.min.z } : { x: 0, y: 0, z: 0 },
    orientation: { u: '+x', v: '+z' }
  }
}

export function addPiece(project: Project, input: PieceInput, id: string): Result<Project> {
  const validation = validatePiece({ ...input, id })
  if (!validation.ok) return validation
  return ok(withPieces(project, [...project.pieces, validation.value]))
}

export function duplicatePiece(project: Project, pieceId: string, id: string): Result<Project> {
  const found = findPiece(project, pieceId)
  if (!found.ok) return found
  const piece = found.value

  const name = `${piece.name.slice(0, MAX_PIECE_NAME - COPY_SUFFIX.length)}${COPY_SUFFIX}`
  return addPiece(project, { ...piece, name, position: freePositionBeside(project, piece) }, id)
}

/** Au contact de la pièce si la place est libre, sinon au bord du meuble. */
function freePositionBeside(project: Project, piece: Piece): Vector {
  const { x, y, z } = piece.position
  const size = pieceSize(piece)
  const candidates: Vector[] = [
    { x: x + size.x, y, z },
    { x: x - size.x, y, z },
    { x, y: y + size.y, z },
    { x, y: y - size.y, z },
    { x, y, z: z + size.z },
    { x, y, z: z - size.z }
  ]
  const others = project.pieces.map(pieceBounds)
  const free = candidates.find((position) => {
    const bounds = pieceBounds({ ...piece, position })
    return others.every((other) => !boundsOverlap(bounds, other))
  })
  return free ?? { x: projectBounds(project)?.max.x ?? x, y, z }
}

export function removePieces(project: Project, pieceIds: readonly string[]): Project {
  const ids = new Set(pieceIds)
  const pieces = project.pieces.filter((piece) => !ids.has(piece.id))
  return pieces.length === project.pieces.length ? project : withPieces(project, pieces)
}

export function updatePiece(project: Project, pieceId: string, changes: PieceChanges): Result<Project> {
  const found = findPiece(project, pieceId)
  if (!found.ok) return found
  const piece = found.value

  const updated: Piece = {
    ...piece,
    name: changes.name?.trim() ?? piece.name,
    material: changes.material?.trim() ?? piece.material,
    thickness: changes.thickness ?? piece.thickness,
    position: changes.position ?? piece.position,
    shape: {
      ...piece.shape,
      length: changes.length ?? piece.shape.length,
      width: changes.width ?? piece.shape.width
    }
  }
  const validation = validatePiece(updated)
  if (!validation.ok) return validation

  const unchanged =
    updated.name === piece.name &&
    updated.material === piece.material &&
    updated.thickness === piece.thickness &&
    updated.shape.length === piece.shape.length &&
    updated.shape.width === piece.shape.width &&
    updated.position.x === piece.position.x &&
    updated.position.y === piece.position.y &&
    updated.position.z === piece.position.z
  return ok(unchanged ? project : replacePiece(project, updated))
}

/** Quart de tour dans le sens direct : ce que devient chaque axe. */
const QUARTER_TURNS: Record<Axis, Record<Axis, SignedAxis>> = {
  x: { x: '+x', y: '+z', z: '-y' },
  y: { x: '-z', y: '+y', z: '+x' },
  z: { x: '+y', y: '-x', z: '+z' }
}

function rotateAxis(signedAxis: SignedAxis, around: Axis): SignedAxis {
  const rotated = QUARTER_TURNS[around][axisOf(signedAxis)]
  if (signedAxis.startsWith('+')) return rotated
  return `${rotated.startsWith('+') ? '-' : '+'}${axisOf(rotated)}`
}

export function rotatePiece(project: Project, pieceId: string, around: Axis): Result<Project> {
  const found = findPiece(project, pieceId)
  if (!found.ok) return found
  const piece = found.value

  const rotated: Piece = {
    ...piece,
    orientation: {
      u: rotateAxis(piece.orientation.u, around),
      v: rotateAxis(piece.orientation.v, around)
    }
  }
  // Tronquer vers zéro rend le demi-dixième réversible : quatre quarts de tour ramènent au départ.
  const before = pieceSize(piece)
  const after = pieceSize(rotated)
  const position: Vector = {
    x: piece.position.x + Math.trunc((before.x - after.x) / 2),
    y: piece.position.y + Math.trunc((before.y - after.y) / 2),
    z: piece.position.z + Math.trunc((before.z - after.z) / 2)
  }
  const validation = validatePiece({ ...rotated, position })
  if (!validation.ok) return validation
  return ok(replacePiece(project, validation.value))
}

export function renameProject(project: Project, name: string): Result<Project> {
  const validation = validateProjectName(name)
  if (!validation.ok) return validation
  return ok({ ...project, name: validation.value })
}
