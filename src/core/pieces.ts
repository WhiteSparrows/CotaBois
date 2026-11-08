import { boundsOverlap, pieceBounds, pieceSize, projectBounds } from './geometry'
import {
  axisOf,
  MAX_PIECE_NAME,
  validatePiece,
  validateProjectName,
  type Axis,
  type CornerName,
  type CornerTreatment,
  type Cutout,
  type Piece,
  type Project,
  type ShapedShape,
  type SignedAxis,
  type Vector
} from './model'
import { err, ok, type Result } from './result'
import { asShaped, cornerSize, CORNER_LABELS, maxCornerSize, normalizeShape, type CutoutInput } from './shape'
import { formatMm, type Tenths } from './units'

export type PieceInput = Omit<Piece, 'id'>

/** Les champs modifiables d'une découpe, selon son type. */
export type CutoutChanges = Partial<Pick<Cutout, 'fromU' | 'fromV'>> & {
  sizeU?: Tenths
  sizeV?: Tenths
  cornerRadius?: Tenths
  diameter?: Tenths
}

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

  return addCopy(project, found.value, id)
}

/** Ajoute une copie d'une pièce, présente ou non dans le projet : c'est aussi le collage. */
export function addCopy(project: Project, piece: Piece, id: string): Result<Project> {
  const name = `${piece.name.slice(0, MAX_PIECE_NAME - COPY_SUFFIX.length)}${COPY_SUFFIX}`
  return addPiece(project, { ...piece, name, position: freePositionNear(project, piece) }, id)
}

/** À sa place si elle est libre, sinon au contact de la pièce, sinon au bord du meuble. */
function freePositionNear(project: Project, piece: Piece): Vector {
  const { x, y, z } = piece.position
  const size = pieceSize(piece)
  const candidates: Vector[] = [
    { x, y, z },
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

/** Change la forme de plusieurs pièces : si l'une refuse, aucune n'est modifiée. */
function changeShapes(
  project: Project,
  pieceIds: readonly string[],
  change: (shape: ShapedShape, piece: Piece) => Result<ShapedShape>
): Result<Project> {
  const updated = new Map<string, Piece>()
  for (const pieceId of pieceIds) {
    const found = findPiece(project, pieceId)
    if (!found.ok) return found

    const changed = change(asShaped(found.value.shape), found.value)
    if (!changed.ok) {
      if (pieceIds.length === 1) return changed
      return err(changed.error.code, `« ${found.value.name} » : ${changed.error.message}`, changed.error.field)
    }
    const validation = validatePiece({ ...found.value, shape: normalizeShape(changed.value) })
    if (!validation.ok) {
      if (pieceIds.length === 1) return validation
      return err(validation.error.code, `« ${found.value.name} » : ${validation.error.message}`, validation.error.field)
    }
    if (JSON.stringify(validation.value.shape) !== JSON.stringify(found.value.shape)) updated.set(pieceId, validation.value)
  }
  if (updated.size === 0) return ok(project)
  return ok(withPieces(project, project.pieces.map((piece) => updated.get(piece.id) ?? piece)))
}

export function setCorner(
  project: Project,
  pieceIds: readonly string[],
  corner: CornerName,
  treatment: CornerTreatment
): Result<Project> {
  return changeShapes(project, pieceIds, (shape) => {
    const maximum = maxCornerSize(shape, corner)
    if (cornerSize(treatment) > maximum) {
      return err(
        'invalid-shape',
        `Le coin ${CORNER_LABELS[corner]} ne peut pas dépasser ${formatMm(maximum)} mm.`,
        `corners.${corner}`
      )
    }
    return ok({ ...shape, corners: { ...shape.corners, [corner]: treatment } })
  })
}

export function addCutout(
  project: Project,
  pieceIds: readonly string[],
  input: CutoutInput,
  nextId: () => string
): Result<Project> {
  return changeShapes(project, pieceIds, (shape) =>
    ok({ ...shape, cutouts: [...shape.cutouts, { ...input, id: nextId() } as Cutout] })
  )
}

export function updateCutout(project: Project, pieceId: string, cutoutId: string, changes: CutoutChanges): Result<Project> {
  return changeShapes(project, [pieceId], (shape) => {
    if (!shape.cutouts.some((cutout) => cutout.id === cutoutId)) {
      return err('unknown-cutout', "Cette découpe n'existe plus.")
    }
    return ok({
      ...shape,
      cutouts: shape.cutouts.map((cutout) => (cutout.id === cutoutId ? ({ ...cutout, ...changes } as Cutout) : cutout))
    })
  })
}

export function removeCutout(project: Project, pieceId: string, cutoutId: string): Result<Project> {
  return changeShapes(project, [pieceId], (shape) =>
    ok({ ...shape, cutouts: shape.cutouts.filter((cutout) => cutout.id !== cutoutId) })
  )
}

export function renameProject(project: Project, name: string): Result<Project> {
  const validation = validateProjectName(name)
  if (!validation.ok) return validation
  return ok({ ...project, name: validation.value })
}
