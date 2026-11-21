import { carcassPieces } from './caisson'
import {
  DIMENSION_RANGE,
  EDGE_NAMES,
  isValidDimension,
  type DrawerParams,
  type Orientation,
  type Piece,
  type Project,
  type Vector
} from './model'
import { err, ok, type Result } from './result'
import { formatMm, type Tenths } from './units'

/** Le meuble à tiroirs : règles de calcul, en dixièmes de millimètre, et refus. */

export const DEFAULT_DRAWER_PARAMS: DrawerParams = {
  width: 6000,
  height: 7200,
  depth: 5600,
  boardThickness: 180,
  backThickness: 50,
  drawerCount: 3,
  frontGap: 30,
  slideGap: 125,
  drawerThickness: 150,
  drawerBottomThickness: 50
}

export const MAX_DRAWERS = 10
const MAX_FRONT_GAP = 100
const MAX_SLIDE_GAP = 500
/** Les côtés d'un tiroir sont 40 mm moins hauts que sa façade. */
const SIDE_MARGIN = 400
const MIN_SIDE_HEIGHT = 500
/** Les coulisses du commerce : de 50 en 50 mm, 250 mm au moins, 10 mm de dégagement à l'arrière. */
const SLIDE_STEP = 500
const MIN_BOX_DEPTH = 2500
const REAR_CLEARANCE = 100

export interface DrawerLayout {
  /** Profondeur des pièces de la carcasse, fond retiré. */
  pieceDepth: Tenths
  frontWidth: Tenths
  frontX: Tenths
  /** De haut en bas : `fronts[0]` est la façade 1. */
  fronts: Array<{ y: Tenths; height: Tenths }>
  boxWidth: Tenths
  sideHeight: Tenths
  boxDepth: Tenths
  /** Longueur de l'avant et de l'arrière, posés entre les côtés. */
  endLength: Tenths
  boxX: Tenths
  boxZ: Tenths
  /** Bas du fond de chaque tiroir, dans l'ordre des façades. */
  drawerBottoms: Tenths[]
}

/** La hauteur commune des façades : le reste de la division va à la façade du bas. */
function commonFrontHeight(params: DrawerParams, count = params.drawerCount): Tenths {
  return Math.floor((params.height - count * params.frontGap) / count)
}

/** Les cotes et positions du meuble, sans aucune vérification : voir `validateDrawerParams`. */
export function drawerLayout(params: DrawerParams): DrawerLayout {
  const { width, height, depth, boardThickness: e, backThickness, drawerCount: n, frontGap: j, slideGap: c } = params
  const t = params.drawerThickness
  const f = params.drawerBottomThickness

  const common = commonFrontHeight(params)
  const remainder = height - n * j - n * common
  // De bas en haut, puis retournées : la façade 1 est en haut.
  const fromBottom: Array<{ y: Tenths; height: Tenths }> = []
  let y = Math.floor(j / 2)
  for (let index = 0; index < n; index++) {
    const frontHeight = index === 0 ? common + remainder : common
    fromBottom.push({ y, height: frontHeight })
    y += frontHeight + j
  }
  const fronts = fromBottom.reverse()

  const pieceDepth = depth - backThickness
  const boxWidth = width - 2 * e - 2 * c
  const sideHeight = common - SIDE_MARGIN
  const boxDepth = Math.floor((pieceDepth - REAR_CLEARANCE) / SLIDE_STEP) * SLIDE_STEP
  return {
    pieceDepth,
    frontWidth: width - j,
    frontX: Math.floor(j / 2),
    fronts,
    boxWidth,
    sideHeight,
    boxDepth,
    endLength: boxWidth - 2 * t,
    boxX: e + c,
    boxZ: depth - boxDepth,
    // Chaque tiroir, fond compris, est centré sur sa façade.
    drawerBottoms: fronts.map((front) => front.y + Math.floor((front.height - sideHeight - f) / 2))
  }
}

/** Le plus grand nombre de tiroirs dont les côtés gardent 50 mm de haut ; 0 si même un seul ne tient pas. */
export function maxDrawerCount(params: DrawerParams): number {
  for (let count = MAX_DRAWERS; count >= 1; count--) {
    if (commonFrontHeight(params, count) - SIDE_MARGIN >= MIN_SIDE_HEIGHT) return count
  }
  return 0
}

function invalid(message: string, field: keyof DrawerParams): Result<DrawerParams> {
  return err('invalid-drawers', message, field)
}

function inRange(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max
}

const DIMENSION_LABELS = {
  width: 'La largeur',
  height: 'La hauteur',
  depth: 'La profondeur',
  boardThickness: "L'épaisseur du bois",
  drawerThickness: "L'épaisseur du bois des tiroirs",
  drawerBottomThickness: "L'épaisseur du fond des tiroirs"
} as const

/** Les refus, dans l'ordre : chaque message dit pourquoi et, quand elle existe, la limite. */
export function validateDrawerParams(params: DrawerParams): Result<DrawerParams> {
  for (const field of ['width', 'height', 'depth', 'boardThickness', 'drawerThickness', 'drawerBottomThickness'] as const) {
    if (!isValidDimension(params[field])) return invalid(`${DIMENSION_LABELS[field]} doit être ${DIMENSION_RANGE}.`, field)
  }
  const { width, height, depth, boardThickness: e, backThickness } = params
  if (backThickness !== 0 && (!isValidDimension(backThickness) || backThickness >= depth)) {
    return invalid(`L'épaisseur du fond doit être nulle, ou ${DIMENSION_RANGE} et inférieure à la profondeur.`, 'backThickness')
  }
  if (!Number.isInteger(params.drawerCount) || params.drawerCount < 1 || params.drawerCount > MAX_DRAWERS) {
    return invalid(`Le nombre de tiroirs doit être un entier de 1 à ${MAX_DRAWERS}.`, 'drawerCount')
  }
  if (!inRange(params.frontGap, MAX_FRONT_GAP)) {
    return invalid('Le jeu entre façades doit être compris entre 0 et 10 mm, à 0,1 mm près.', 'frontGap')
  }
  if (!inRange(params.slideGap, MAX_SLIDE_GAP)) {
    return invalid('Le jeu des coulisses doit être compris entre 0 et 50 mm, à 0,1 mm près.', 'slideGap')
  }
  const twoBoards = `${formatMm(2 * e)} mm`
  if (width <= 2 * e) return invalid(`La largeur doit être supérieure à deux épaisseurs de bois (${twoBoards}).`, 'width')
  if (height <= 2 * e) return invalid(`La hauteur doit être supérieure à deux épaisseurs de bois (${twoBoards}).`, 'height')

  const layout = drawerLayout(params)
  if (layout.sideHeight < MIN_SIDE_HEIGHT) {
    const max = maxDrawerCount(params)
    if (max >= 1) return invalid(`Trop de tiroirs pour cette hauteur : ${max} au maximum.`, 'drawerCount')
    const minHeight = MIN_SIDE_HEIGHT + SIDE_MARGIN + params.frontGap
    return invalid(`La hauteur est trop faible pour un tiroir : il faut au moins ${formatMm(minHeight)} mm.`, 'height')
  }
  if (layout.boxDepth < MIN_BOX_DEPTH) {
    const minDepth = backThickness + REAR_CLEARANCE + MIN_BOX_DEPTH
    return invalid(`La profondeur doit être d'au moins ${formatMm(minDepth)} mm, pour des coulisses de 250 mm.`, 'depth')
  }
  if (layout.endLength < 1) {
    return invalid("La largeur est trop faible pour des tiroirs : l'avant et l'arrière n'auraient plus de longueur.", 'width')
  }
  const lowest = layout.drawerBottoms[layout.drawerBottoms.length - 1]!
  const highest = layout.drawerBottoms[0]! + params.drawerBottomThickness + layout.sideHeight
  if (lowest < e || highest > height - e) {
    return invalid(
      "Les tiroirs touchent le dessus ou le dessous du caisson : réduisez l'épaisseur du bois ou le nombre de tiroirs.",
      'boardThickness'
    )
  }
  return ok(params)
}

/** Remplace les pièces par le meuble généré : la carcasse, puis chaque façade suivie de sa boîte, de haut en bas. */
export function applyDrawerCabinet(project: Project, params: DrawerParams, nextId: () => string): Result<Project> {
  const validation = validateDrawerParams(params)
  if (!validation.ok) return validation

  // Comme pour le caisson, l'option n'est enregistrée que si elle est active.
  const { frontEdges, ...values } = params
  const normalized: DrawerParams = frontEdges ? { ...values, frontEdges: true } : values
  return ok({
    ...project,
    pieces: generatePieces(normalized, nextId),
    template: { kind: 'drawers', params: normalized, customized: false }
  })
}

function generatePieces(params: DrawerParams, nextId: () => string): Piece[] {
  const { width, height, depth, boardThickness: e, backThickness, frontEdges } = params
  const t = params.drawerThickness
  const f = params.drawerBottomThickness
  const layout = drawerLayout(params)

  const panel = (name: string, length: Tenths, panelWidth: Tenths, thickness: Tenths, position: Vector, orientation: Orientation): Piece => ({
    id: nextId(),
    name,
    shape: { kind: 'rectangle', length, width: panelWidth },
    thickness,
    material: '',
    position,
    orientation
  })

  const pieces = carcassPieces({ width, height, depth, boardThickness: e, backThickness, ...(frontEdges ? { frontEdges } : {}) }, nextId)
  layout.fronts.forEach((front, index) => {
    const k = index + 1
    const facade = panel(`Façade ${k}`, layout.frontWidth, front.height, e, { x: layout.frontX, y: front.y, z: depth }, { u: '+x', v: '+y' })
    pieces.push(frontEdges ? { ...facade, edges: EDGE_NAMES } : facade)

    const bottomY = layout.drawerBottoms[index]!
    const sideY = bottomY + f
    const { boxX: x, boxZ: z, boxDepth, boxWidth, sideHeight, endLength } = layout
    const side = (label: string, sideX: Tenths) =>
      panel(`Tiroir ${k} ${label}`, boxDepth, sideHeight, t, { x: sideX, y: sideY, z }, { u: '+z', v: '+y' })
    const end = (label: string, endZ: Tenths) =>
      panel(`Tiroir ${k} ${label}`, endLength, sideHeight, t, { x: x + t, y: sideY, z: endZ }, { u: '+x', v: '+y' })
    pieces.push(
      side('côté gauche', x),
      side('côté droit', x + boxWidth - t),
      end('avant', depth - t),
      end('arrière', z),
      panel(`Tiroir ${k} fond`, boxWidth, boxDepth, f, { x, y: bottomY, z }, { u: '+x', v: '+z' })
    )
  })
  return pieces
}
