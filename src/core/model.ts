import { err, ok, type Result } from './result'
import { validateShape } from './shape'
import type { Tenths } from './units'

export const MAX_DIMENSION = 100_000
export const MAX_POSITION = 1_000_000
export const MAX_PIECE_NAME = 80
export const MAX_MATERIAL = 80
export const MAX_PROJECT_NAME = 120

export type Axis = 'x' | 'y' | 'z'
export type SignedAxis = `${'+' | '-'}${Axis}`

export interface Vector {
  x: number
  y: number
  z: number
}

/** `u` suit la longueur et `v` la largeur ; l'épaisseur suit le troisième axe. */
export interface Orientation {
  u: SignedAxis
  v: SignedAxis
}

export interface RectangleShape {
  kind: 'rectangle'
  length: Tenths
  width: Tenths
}

export type CornerTreatment =
  | { kind: 'straight' }
  | { kind: 'round'; radius: Tenths }
  | { kind: 'chamfer'; size: Tenths }

export type CornerName = 'bottomLeft' | 'bottomRight' | 'topRight' | 'topLeft'

/** Distance à un bord choisi : la découpe suit ce bord si la pièce change de dimension. */
export interface EdgeDistance<Edge extends string> {
  edge: Edge
  distance: Tenths
}

interface CutoutPosition {
  id: string
  fromU: EdgeDistance<'left' | 'right'>
  fromV: EdgeDistance<'bottom' | 'top'>
}

/** La distance va du bord choisi au côté le plus proche. Touchant un bord, c'est une encoche. */
export interface RectangleCutout extends CutoutPosition {
  kind: 'rectangle'
  sizeU: Tenths
  sizeV: Tenths
  /** Ne s'applique qu'aux angles situés à l'intérieur de la pièce. */
  cornerRadius: Tenths
}

/** La distance va du bord choisi au centre. */
export interface CircleCutout extends CutoutPosition {
  kind: 'circle'
  diameter: Tenths
}

export type Cutout = RectangleCutout | CircleCutout

/** Retranchée du rectangle `length` × `width`, qu'elle ne dépasse jamais. `u` suit la longueur, `v` la largeur. */
export interface ShapedShape {
  kind: 'shaped'
  length: Tenths
  width: Tenths
  corners: Record<CornerName, CornerTreatment>
  cutouts: readonly Cutout[]
}

export type Shape = RectangleShape | ShapedShape

export interface Piece {
  id: string
  name: string
  shape: Shape
  thickness: Tenths
  material: string
  /** Coin minimal de la boîte englobante. */
  position: Vector
  orientation: Orientation
}

export interface CaissonParams {
  width: Tenths
  height: Tenths
  depth: Tenths
  boardThickness: Tenths
  /** 0 si le caisson n'a pas de fond. */
  backThickness: Tenths
  shelfCount: number
}

/** Seule variante pour l'instant : d'autres modèles s'ajouteront ici. */
export interface CaissonTemplate {
  kind: 'caisson'
  params: CaissonParams
  /** Vrai dès qu'une pièce a été retouchée à la main. */
  customized: boolean
}

export type Template = CaissonTemplate

export interface Project {
  name: string
  pieces: readonly Piece[]
  template: Template | null
}

export function createEmptyProject(): Project {
  return { name: 'Nouveau meuble', pieces: [], template: null }
}

export function shapeExtent(shape: Shape): { length: Tenths; width: Tenths } {
  return { length: shape.length, width: shape.width }
}

export function axisOf(signedAxis: SignedAxis): Axis {
  return signedAxis.charAt(1) as Axis
}

export function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_DIMENSION
}

export const DIMENSION_RANGE = 'comprise entre 0,1 et 10 000 mm'

function isValidCoordinate(value: number): boolean {
  return Number.isInteger(value) && Math.abs(value) <= MAX_POSITION
}

export function validatePiece(piece: Piece): Result<Piece> {
  const nameLength = piece.name.trim().length
  if (nameLength < 1 || nameLength > MAX_PIECE_NAME) {
    return err('invalid-piece', `Le nom doit contenir de 1 à ${MAX_PIECE_NAME} caractères.`, 'name')
  }
  if (piece.material.trim().length > MAX_MATERIAL) {
    return err('invalid-piece', `Le matériau ne peut pas dépasser ${MAX_MATERIAL} caractères.`, 'material')
  }

  const { length, width } = shapeExtent(piece.shape)
  if (!isValidDimension(length)) {
    return err('invalid-piece', `La longueur doit être ${DIMENSION_RANGE}.`, 'length')
  }
  if (!isValidDimension(width)) {
    return err('invalid-piece', `La largeur doit être ${DIMENSION_RANGE}.`, 'width')
  }
  if (!isValidDimension(piece.thickness)) {
    return err('invalid-piece', `L'épaisseur doit être ${DIMENSION_RANGE}.`, 'thickness')
  }
  if (piece.shape.kind === 'shaped') {
    const shapeValidation = validateShape(piece.shape)
    if (!shapeValidation.ok) return err('invalid-piece', shapeValidation.error.message, 'shape')
  }

  const { x, y, z } = piece.position
  if (!isValidCoordinate(x) || !isValidCoordinate(y) || !isValidCoordinate(z)) {
    return err('invalid-piece', 'La position doit rester entre -100 000 et 100 000 mm.', 'position')
  }
  if (axisOf(piece.orientation.u) === axisOf(piece.orientation.v)) {
    return err('invalid-piece', 'La longueur et la largeur doivent suivre deux axes différents.', 'orientation')
  }
  return ok(piece)
}

export function validateProjectName(name: string): Result<string> {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > MAX_PROJECT_NAME) {
    return err('invalid-project', `Le nom du projet doit contenir de 1 à ${MAX_PROJECT_NAME} caractères.`, 'name')
  }
  return ok(trimmed)
}
