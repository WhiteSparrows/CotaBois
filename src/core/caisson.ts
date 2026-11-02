import { DIMENSION_RANGE, isValidDimension, type CaissonParams, type Orientation, type Piece, type Project, type Vector } from './model'
import { err, ok, type Result } from './result'
import { formatMm, type Tenths } from './units'

export const MAX_SHELVES = 100

const DIMENSION_LABELS = {
  width: 'La largeur',
  height: 'La hauteur',
  depth: 'La profondeur',
  boardThickness: "L'épaisseur du bois"
} as const

function invalid(message: string, field: keyof CaissonParams): Result<CaissonParams> {
  return err('invalid-caisson', message, field)
}

export function validateCaissonParams(params: CaissonParams): Result<CaissonParams> {
  for (const field of ['width', 'height', 'depth', 'boardThickness'] as const) {
    if (!isValidDimension(params[field])) {
      return invalid(`${DIMENSION_LABELS[field]} doit être ${DIMENSION_RANGE}.`, field)
    }
  }
  const { width, height, depth, boardThickness, backThickness, shelfCount } = params
  if (backThickness !== 0 && !isValidDimension(backThickness)) {
    return invalid(`L'épaisseur du fond doit être nulle ou ${DIMENSION_RANGE}.`, 'backThickness')
  }

  const twoBoards = `${formatMm(2 * boardThickness)} mm`
  if (width <= 2 * boardThickness) {
    return invalid(`La largeur doit être supérieure à deux épaisseurs de bois (${twoBoards}).`, 'width')
  }
  if (height <= 2 * boardThickness) {
    return invalid(`La hauteur doit être supérieure à deux épaisseurs de bois (${twoBoards}).`, 'height')
  }
  if (depth <= backThickness) {
    return invalid(`La profondeur doit être supérieure à l'épaisseur du fond (${formatMm(backThickness)} mm).`, 'depth')
  }

  if (!Number.isInteger(shelfCount) || shelfCount < 0) {
    return invalid("Le nombre d'étagères doit être un entier positif ou nul.", 'shelfCount')
  }
  const innerHeight = height - 2 * boardThickness
  const maxShelves = Math.min(Math.ceil(innerHeight / boardThickness) - 1, MAX_SHELVES)
  if (shelfCount > maxShelves) {
    return invalid(`Trop d'étagères pour ce caisson : ${maxShelves} au maximum.`, 'shelfCount')
  }
  return ok(params)
}

export function applyCaisson(project: Project, params: CaissonParams, nextId: () => string): Result<Project> {
  const validation = validateCaissonParams(params)
  if (!validation.ok) return validation

  return ok({
    ...project,
    pieces: generatePieces(params, nextId),
    template: { kind: 'caisson', params, customized: false }
  })
}

function generatePieces(params: CaissonParams, nextId: () => string): Piece[] {
  const { width, height, depth, boardThickness: e, backThickness: back, shelfCount: n } = params
  const pieceDepth = depth - back
  const innerWidth = width - 2 * e
  const freeHeight = height - 2 * e - n * e

  const board = (name: string, length: Tenths, position: Vector, orientation: Orientation): Piece => ({
    id: nextId(),
    name,
    shape: { kind: 'rectangle', length, width: pieceDepth },
    thickness: e,
    material: '',
    position,
    orientation
  })
  const side = (name: string, x: Tenths) => board(name, height, { x, y: 0, z: back }, { u: '+y', v: '+z' })
  const horizontal = (name: string, y: Tenths) => board(name, innerWidth, { x: e, y, z: back }, { u: '+x', v: '+z' })

  const pieces = [
    side('Côté gauche', 0),
    side('Côté droit', width - e),
    horizontal('Dessous', 0),
    horizontal('Dessus', height - e)
  ]
  for (let k = 1; k <= n; k++) {
    const y = e + (k - 1) * e + Math.round((k * freeHeight) / (n + 1))
    pieces.push(horizontal(`Étagère ${k}`, y))
  }
  if (back > 0) {
    pieces.push({
      id: nextId(),
      name: 'Fond',
      shape: { kind: 'rectangle', length: height, width },
      thickness: back,
      material: '',
      position: { x: 0, y: 0, z: 0 },
      orientation: { u: '+y', v: '+x' }
    })
  }
  return pieces
}
