import type { CornerName, CornerTreatment, Cutout, Shape, ShapedShape } from './model'
import { err, ok, type Result } from './result'
import { formatMm, type Tenths } from './units'

export const MAX_CUTOUTS = 50

export const CORNER_NAMES: readonly CornerName[] = ['bottomLeft', 'bottomRight', 'topRight', 'topLeft']

export const CORNER_LABELS: Record<CornerName, string> = {
  bottomLeft: 'bas gauche',
  bottomRight: 'bas droit',
  topRight: 'haut droit',
  topLeft: 'haut gauche'
}

const NEIGHBOR_ALONG_LENGTH: Record<CornerName, CornerName> = {
  bottomLeft: 'bottomRight',
  bottomRight: 'bottomLeft',
  topRight: 'topLeft',
  topLeft: 'topRight'
}

const NEIGHBOR_ALONG_WIDTH: Record<CornerName, CornerName> = {
  bottomLeft: 'topLeft',
  bottomRight: 'topRight',
  topRight: 'bottomRight',
  topLeft: 'bottomLeft'
}

const STRAIGHT: CornerTreatment = { kind: 'straight' }

interface CutoutBox {
  minU: number
  maxU: number
  minV: number
  maxV: number
}

export interface ResolvedRectangle extends CutoutBox {
  kind: 'rectangle'
  cornerRadius: Tenths
}

/** Un diamètre impair donne un demi-dixième, qu'un nombre flottant représente exactement. */
export interface ResolvedCircle extends CutoutBox {
  kind: 'circle'
  centerU: number
  centerV: number
  radius: number
}

export type ResolvedCutout = ResolvedRectangle | ResolvedCircle

export function asShaped(shape: Shape): ShapedShape {
  if (shape.kind === 'shaped') return shape
  return {
    kind: 'shaped',
    length: shape.length,
    width: shape.width,
    corners: { bottomLeft: STRAIGHT, bottomRight: STRAIGHT, topRight: STRAIGHT, topLeft: STRAIGHT },
    cutouts: []
  }
}

/** Une forme sans modification est un rectangle : un meuble sans forme reste strictement identique. */
export function normalizeShape(shape: Shape): Shape {
  if (shape.kind === 'rectangle' || shape.cutouts.length > 0) return shape
  if (CORNER_NAMES.some((corner) => shape.corners[corner].kind !== 'straight')) return shape
  return { kind: 'rectangle', length: shape.length, width: shape.width }
}

export function cornerSize(treatment: CornerTreatment): Tenths {
  if (treatment.kind === 'round') return treatment.radius
  return treatment.kind === 'chamfer' ? treatment.size : 0
}

export function resolveCutout(shape: ShapedShape, cutout: Cutout): ResolvedCutout {
  if (cutout.kind === 'circle') {
    const centerU = cutout.fromU.edge === 'left' ? cutout.fromU.distance : shape.length - cutout.fromU.distance
    const centerV = cutout.fromV.edge === 'bottom' ? cutout.fromV.distance : shape.width - cutout.fromV.distance
    const radius = cutout.diameter / 2
    return {
      kind: 'circle',
      centerU,
      centerV,
      radius,
      minU: centerU - radius,
      maxU: centerU + radius,
      minV: centerV - radius,
      maxV: centerV + radius
    }
  }
  const minU = cutout.fromU.edge === 'left' ? cutout.fromU.distance : shape.length - cutout.fromU.distance - cutout.sizeU
  const minV = cutout.fromV.edge === 'bottom' ? cutout.fromV.distance : shape.width - cutout.fromV.distance - cutout.sizeV
  return {
    kind: 'rectangle',
    cornerRadius: cutout.cornerRadius,
    minU,
    maxU: minU + cutout.sizeU,
    minV,
    maxV: minV + cutout.sizeV
  }
}

function boxesTouch(a: CutoutBox, b: CutoutBox): boolean {
  return a.minU <= b.maxU && b.minU <= a.maxU && a.minV <= b.maxV && b.minV <= a.maxV
}

function circleTouchesBox(circle: ResolvedCircle, box: CutoutBox): boolean {
  const nearestU = Math.max(box.minU, Math.min(circle.centerU, box.maxU))
  const nearestV = Math.max(box.minV, Math.min(circle.centerV, box.maxV))
  return (nearestU - circle.centerU) ** 2 + (nearestV - circle.centerV) ** 2 <= circle.radius ** 2
}

function cutoutsTouch(a: ResolvedCutout, b: ResolvedCutout): boolean {
  if (a.kind === 'circle' && b.kind === 'circle') {
    return (a.centerU - b.centerU) ** 2 + (a.centerV - b.centerV) ** 2 <= (a.radius + b.radius) ** 2
  }
  if (a.kind === 'circle') return circleTouchesBox(a, b)
  if (b.kind === 'circle') return circleTouchesBox(b, a)
  return boxesTouch(a, b)
}

function cornerSquare(shape: ShapedShape, corner: CornerName, size: Tenths): CutoutBox {
  const isLeft = corner === 'bottomLeft' || corner === 'topLeft'
  const isBottom = corner === 'bottomLeft' || corner === 'bottomRight'
  return {
    minU: isLeft ? 0 : shape.length - size,
    maxU: isLeft ? size : shape.length,
    minV: isBottom ? 0 : shape.width - size,
    maxV: isBottom ? size : shape.width
  }
}

/** La place que laissent, sur ses deux côtés, les coins voisins. */
function cornerSideLimit(shape: ShapedShape, corner: CornerName): Tenths {
  return Math.min(
    shape.length - cornerSize(shape.corners[NEIGHBOR_ALONG_LENGTH[corner]]),
    shape.width - cornerSize(shape.corners[NEIGHBOR_ALONG_WIDTH[corner]])
  )
}

/** La plus grande taille possible pour ce coin, compte tenu des coins voisins et des découpes. */
export function maxCornerSize(shape: ShapedShape, corner: CornerName): Tenths {
  const isLeft = corner === 'bottomLeft' || corner === 'topLeft'
  const isBottom = corner === 'bottomLeft' || corner === 'bottomRight'
  let maximum = cornerSideLimit(shape, corner)

  for (const cutout of shape.cutouts) {
    const box = resolveCutout(shape, cutout)
    const distanceU = isLeft ? box.minU : shape.length - box.maxU
    const distanceV = isBottom ? box.minV : shape.width - box.maxV
    // Le carré du coin touche la découpe dès que sa taille atteint la plus grande des deux distances.
    maximum = Math.min(maximum, Math.ceil(Math.max(distanceU, distanceV)) - 1)
  }
  return Math.max(maximum, 0)
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1
}

function invalid<T = ShapedShape>(message: string, field?: string): Result<T> {
  return err('invalid-shape', message, field)
}

function validateCorners(shape: ShapedShape): Result<ShapedShape> {
  for (const corner of CORNER_NAMES) {
    const treatment = shape.corners[corner]
    const field = `corners.${corner}`
    const label = `coin ${CORNER_LABELS[corner]}`
    if (treatment.kind === 'round' && !isPositiveInteger(treatment.radius)) {
      return invalid(`Le rayon du ${label} doit être d'au moins 0,1 mm.`, field)
    }
    if (treatment.kind === 'chamfer' && !isPositiveInteger(treatment.size)) {
      return invalid(`Le chanfrein du ${label} doit être d'au moins 0,1 mm.`, field)
    }
    const limit = cornerSideLimit(shape, corner)
    if (cornerSize(treatment) > limit) {
      return invalid(`Le ${label} ne peut pas dépasser ${formatMm(Math.max(limit, 0))} mm sur ce côté.`, field)
    }
  }
  return ok(shape)
}

function validateCutoutFields(shape: ShapedShape, cutout: Cutout): Result<ShapedShape> {
  const field = `cutouts.${cutout.id}`
  const validDistance = (distance: number, dimension: number) => Number.isInteger(distance) && distance >= 0 && distance <= dimension
  if (!validDistance(cutout.fromU.distance, shape.length) || !validDistance(cutout.fromV.distance, shape.width)) {
    return invalid('La distance à un bord doit rester dans les limites de la pièce.', field)
  }

  if (cutout.kind === 'circle') {
    if (!isPositiveInteger(cutout.diameter)) return invalid("Le diamètre d'un trou doit être d'au moins 0,1 mm.", field)
    return ok(shape)
  }
  if (!isPositiveInteger(cutout.sizeU) || !isPositiveInteger(cutout.sizeV)) {
    return invalid("Les cotes d'une découpe doivent être d'au moins 0,1 mm.", field)
  }
  const maxRadius = Math.floor(Math.min(cutout.sizeU, cutout.sizeV) / 2)
  if (!Number.isInteger(cutout.cornerRadius) || cutout.cornerRadius < 0 || cutout.cornerRadius > maxRadius) {
    return invalid(`Le rayon d'angle ne peut pas dépasser ${formatMm(maxRadius)} mm pour cette découpe.`, field)
  }
  return ok(shape)
}

function validateCutoutPlacement(shape: ShapedShape, cutout: Cutout, box: ResolvedCutout): Result<ShapedShape> {
  const field = `cutouts.${cutout.id}`
  if (box.kind === 'circle') {
    if (box.minU <= 0 || box.maxU >= shape.length || box.minV <= 0 || box.maxV >= shape.width) {
      return invalid("Un trou rond doit rester à l'intérieur de la pièce, sans toucher un bord.", field)
    }
    return ok(shape)
  }
  if (box.minU < 0 || box.maxU > shape.length || box.minV < 0 || box.maxV > shape.width) {
    return invalid('Cette découpe dépasse de la pièce.', field)
  }
  if ((box.minU === 0 && box.maxU === shape.length) || (box.minV === 0 && box.maxV === shape.width)) {
    return invalid('Cette découpe couperait la pièce en deux.', field)
  }
  return ok(shape)
}

/** Vérifie une forme ; si elle est acceptée, la pièce reste forcément d'un seul tenant. */
export function validateShape(shape: ShapedShape): Result<ShapedShape> {
  const corners = validateCorners(shape)
  if (!corners.ok) return corners

  if (shape.cutouts.length > MAX_CUTOUTS) return invalid(`Une pièce accepte au plus ${MAX_CUTOUTS} découpes.`, 'cutouts')
  if (new Set(shape.cutouts.map((cutout) => cutout.id)).size !== shape.cutouts.length) {
    return invalid('Deux découpes portent le même identifiant.', 'cutouts')
  }

  for (const cutout of shape.cutouts) {
    const fields = validateCutoutFields(shape, cutout)
    if (!fields.ok) return fields
  }

  const boxes = shape.cutouts.map((cutout) => resolveCutout(shape, cutout))
  for (const [index, cutout] of shape.cutouts.entries()) {
    const box = boxes[index]!
    const placement = validateCutoutPlacement(shape, cutout, box)
    if (!placement.ok) return placement

    for (let other = index + 1; other < boxes.length; other++) {
      if (cutoutsTouch(box, boxes[other]!)) {
        return invalid('Deux découpes se touchent ou se recouvrent.', `cutouts.${cutout.id}`)
      }
    }
    for (const corner of CORNER_NAMES) {
      const size = cornerSize(shape.corners[corner])
      if (size > 0 && boxesTouch(box, cornerSquare(shape, corner, size))) {
        return invalid(`Cette découpe touche le coin ${CORNER_LABELS[corner]}, déjà modifié.`, `cutouts.${cutout.id}`)
      }
    }
  }
  return ok(shape)
}

function cornerRemoves(treatment: CornerTreatment, a: number, b: number): boolean {
  const size = cornerSize(treatment)
  if (size === 0 || a >= size || b >= size) return false
  if (treatment.kind === 'chamfer') return a + b < size
  return (a - size) ** 2 + (b - size) ** 2 > size ** 2
}

function isInteriorPoint(shape: ShapedShape, u: number, v: number): boolean {
  return u > 0 && u < shape.length && v > 0 && v < shape.width
}

function rectangleRemoves(shape: ShapedShape, box: ResolvedRectangle, u: number, v: number): boolean {
  if (u <= box.minU || u >= box.maxU || v <= box.minV || v >= box.maxV) return false
  const radius = box.cornerRadius
  if (radius === 0) return true

  for (const cornerU of [box.minU, box.maxU]) {
    for (const cornerV of [box.minV, box.maxV]) {
      if (!isInteriorPoint(shape, cornerU, cornerV)) continue
      const a = Math.abs(u - cornerU)
      const b = Math.abs(v - cornerV)
      // Dans l'angle arrondi d'une découpe, la matière reste.
      if (a < radius && b < radius && (a - radius) ** 2 + (b - radius) ** 2 > radius ** 2) return false
    }
  }
  return true
}

/** Vrai si le point, dans le repère de la pièce, est dans la matière. */
export function shapeContains(shape: Shape, u: number, v: number): boolean {
  if (u < 0 || u > shape.length || v < 0 || v > shape.width) return false
  if (shape.kind === 'rectangle') return true

  const a = { left: u, right: shape.length - u }
  const b = { bottom: v, top: shape.width - v }
  if (
    cornerRemoves(shape.corners.bottomLeft, a.left, b.bottom) ||
    cornerRemoves(shape.corners.bottomRight, a.right, b.bottom) ||
    cornerRemoves(shape.corners.topRight, a.right, b.top) ||
    cornerRemoves(shape.corners.topLeft, a.left, b.top)
  ) {
    return false
  }

  for (const cutout of shape.cutouts) {
    const box = resolveCutout(shape, cutout)
    if (box.kind === 'circle') {
      if ((u - box.centerU) ** 2 + (v - box.centerV) ** 2 < box.radius ** 2) return false
    } else if (rectangleRemoves(shape, box, u, v)) {
      return false
    }
  }
  return true
}

export interface PlanePoint {
  u: number
  v: number
}

export type OutlineSegment =
  | { kind: 'line'; to: PlanePoint }
  | { kind: 'arc'; to: PlanePoint; center: PlanePoint; radius: number; startAngle: number; endAngle: number; clockwise: boolean }

export interface OutlinePath {
  start: PlanePoint
  segments: OutlineSegment[]
}

export interface ShapeOutline {
  outer: OutlinePath
  holes: OutlinePath[]
}

const HALF_PI = Math.PI / 2

class PathBuilder {
  readonly segments: OutlineSegment[] = []
  private current: PlanePoint

  constructor(readonly start: PlanePoint) {
    this.current = start
  }

  private isCurrent(point: PlanePoint): boolean {
    return point.u === this.current.u && point.v === this.current.v
  }

  line(to: PlanePoint): void {
    if (this.isCurrent(to)) return
    this.segments.push({ kind: 'line', to })
    this.current = to
  }

  arc(to: PlanePoint, center: PlanePoint, radius: number, startAngle: number, endAngle: number): void {
    this.segments.push({ kind: 'arc', to, center, radius, startAngle, endAngle, clockwise: endAngle < startAngle })
    this.current = to
  }

  build(): OutlinePath {
    return { start: this.start, segments: this.segments }
  }
}

interface BoxCorner {
  /** Le point où l'on arrive, et celui où l'on repart, une fois l'angle arrondi. */
  enter: PlanePoint
  exit: PlanePoint
  center: PlanePoint
  startAngle: number
  endAngle: number
}

/** Les côtés de la découpe, dans le sens où le contour de la matière la contourne. */
function boxEdges(box: ResolvedRectangle): Array<{ onBoundary: (shape: ShapedShape) => boolean; from: PlanePoint; to: PlanePoint; end: BoxCorner }> {
  const { minU, maxU, minV, maxV, cornerRadius: r } = box
  const A = { u: minU, v: minV }
  const D = { u: minU, v: maxV }
  const C = { u: maxU, v: maxV }
  const B = { u: maxU, v: minV }
  return [
    {
      onBoundary: () => minU === 0,
      from: A,
      to: D,
      end: { enter: { u: minU, v: maxV - r }, exit: { u: minU + r, v: maxV }, center: { u: minU + r, v: maxV - r }, startAngle: Math.PI, endAngle: HALF_PI }
    },
    {
      onBoundary: (shape) => maxV === shape.width,
      from: D,
      to: C,
      end: { enter: { u: maxU - r, v: maxV }, exit: { u: maxU, v: maxV - r }, center: { u: maxU - r, v: maxV - r }, startAngle: HALF_PI, endAngle: 0 }
    },
    {
      onBoundary: (shape) => maxU === shape.length,
      from: C,
      to: B,
      end: { enter: { u: maxU, v: minV + r }, exit: { u: maxU - r, v: minV }, center: { u: maxU - r, v: minV + r }, startAngle: 0, endAngle: -HALF_PI }
    },
    {
      onBoundary: () => minV === 0,
      from: B,
      to: A,
      end: { enter: { u: minU + r, v: minV }, exit: { u: minU, v: minV + r }, center: { u: minU + r, v: minV + r }, startAngle: -HALF_PI, endAngle: -Math.PI }
    }
  ]
}

function addBoxCorner(path: PathBuilder, corner: BoxCorner, radius: number): void {
  path.line(corner.enter)
  if (radius > 0) path.arc(corner.exit, corner.center, radius, corner.startAngle, corner.endAngle)
}

function rectangleHole(box: ResolvedRectangle): OutlinePath {
  const edges = boxEdges(box)
  const path = new PathBuilder(edges[3]!.end.exit)
  for (const edge of edges) addBoxCorner(path, edge.end, box.cornerRadius)
  return path.build()
}

function circleHole(box: ResolvedCircle): OutlinePath {
  const { centerU: u, centerV: v, radius: r } = box
  const center = { u, v }
  const path = new PathBuilder({ u: u + r, v })
  path.arc({ u, v: v + r }, center, r, 0, HALF_PI)
  path.arc({ u: u - r, v }, center, r, HALF_PI, Math.PI)
  path.arc({ u, v: v - r }, center, r, Math.PI, 3 * HALF_PI)
  path.arc({ u: u + r, v }, center, r, 3 * HALF_PI, 2 * Math.PI)
  return path.build()
}

/** Une encoche vue depuis le périmètre : où le contour la quitte et la rejoint, et son parcours intérieur. */
interface Notch {
  entryT: number
  exitT: number
  entry: PlanePoint
  radius: number
  corners: BoxCorner[]
  exit: PlanePoint
}

function perimeterPosition(shape: ShapedShape, point: PlanePoint): number {
  const { length: L, width: W } = shape
  if (point.v === 0) return point.u
  if (point.u === L) return L + point.v
  if (point.v === W) return L + W + (L - point.u)
  return 2 * L + W + (W - point.v)
}

function perimeterPoint(shape: ShapedShape, t: number): PlanePoint {
  const { length: L, width: W } = shape
  const position = ((t % (2 * L + 2 * W)) + 2 * L + 2 * W) % (2 * L + 2 * W)
  if (position <= L) return { u: position, v: 0 }
  if (position <= L + W) return { u: L, v: position - L }
  if (position <= 2 * L + W) return { u: L - (position - L - W), v: W }
  return { u: 0, v: W - (position - 2 * L - W) }
}

function buildNotch(shape: ShapedShape, box: ResolvedRectangle): Notch {
  const edges = boxEdges(box)
  // La chaîne intérieure commence juste après le dernier côté posé sur le bord de la pièce.
  const lastOnBoundary = [3, 2, 1, 0].find((i) => edges[i]!.onBoundary(shape) && !edges[(i + 1) % 4]!.onBoundary(shape))!
  const chain = [1, 2, 3, 4].map((step) => edges[(lastOnBoundary + step) % 4]!).filter((edge) => !edge.onBoundary(shape))

  const entry = chain[0]!.from
  const exit = chain.at(-1)!.to
  return {
    entry,
    exit,
    entryT: perimeterPosition(shape, entry),
    exitT: perimeterPosition(shape, exit),
    radius: box.cornerRadius,
    corners: chain.slice(0, -1).map((edge) => edge.end)
  }
}

function addCorner(path: PathBuilder, shape: ShapedShape, corner: CornerName, t: number): number {
  const treatment = shape.corners[corner]
  const size = cornerSize(treatment)
  path.line(perimeterPoint(shape, t - size))
  if (size === 0) return t

  const exit = perimeterPoint(shape, t + size)
  if (treatment.kind === 'chamfer') {
    path.line(exit)
    return t + size
  }
  const { length: L, width: W } = shape
  const arcs: Record<CornerName, { center: PlanePoint; startAngle: number }> = {
    bottomRight: { center: { u: L - size, v: size }, startAngle: -HALF_PI },
    topRight: { center: { u: L - size, v: W - size }, startAngle: 0 },
    topLeft: { center: { u: size, v: W - size }, startAngle: HALF_PI },
    bottomLeft: { center: { u: size, v: size }, startAngle: Math.PI }
  }
  const { center, startAngle } = arcs[corner]
  path.arc(exit, center, size, startAngle, startAngle + HALF_PI)
  return t + size
}

function addPerimeterRun(path: PathBuilder, shape: ShapedShape, from: number, to: number): void {
  const { length: L, width: W } = shape
  const perimeter = 2 * L + 2 * W
  const cornerPositions: Array<[CornerName, number]> = [
    ['bottomRight', L],
    ['topRight', L + W],
    ['topLeft', 2 * L + W],
    ['bottomLeft', perimeter]
  ]
  const passes = [0, perimeter]
    .flatMap((offset) => cornerPositions.map(([corner, t]) => [corner, t + offset] as const))
    .filter(([, t]) => t > from && t < to)
    .sort((a, b) => a[1] - b[1])

  for (const [corner, t] of passes) addCorner(path, shape, corner, t)
  path.line(perimeterPoint(shape, to))
}

function outerPath(shape: ShapedShape, notches: Notch[]): OutlinePath {
  const perimeter = 2 * shape.length + 2 * shape.width
  if (notches.length === 0) {
    const start = cornerSize(shape.corners.bottomLeft)
    const path = new PathBuilder(perimeterPoint(shape, start))
    addPerimeterRun(path, shape, start, perimeter + start)
    return path.build()
  }

  const sorted = [...notches].sort((a, b) => a.entryT - b.entryT)
  const path = new PathBuilder(sorted.at(-1)!.exit)
  let t = sorted.at(-1)!.exitT
  for (const notch of sorted) {
    let entryT = notch.entryT
    while (entryT <= t) entryT += perimeter
    addPerimeterRun(path, shape, t, entryT)
    for (const corner of notch.corners) addBoxCorner(path, corner, notch.radius)
    path.line(notch.exit)
    t = notch.exitT
  }
  return path.build()
}

function touchesBoundary(shape: ShapedShape, box: CutoutBox): boolean {
  return box.minU === 0 || box.minV === 0 || box.maxU === shape.length || box.maxV === shape.width
}

/** Le contour extérieur et les trous d'une forme valide, en segments et arcs exacts. */
export function shapeOutline(shape: ShapedShape): ShapeOutline {
  const boxes = shape.cutouts.map((cutout) => resolveCutout(shape, cutout))
  const notches: Notch[] = []
  const holes: OutlinePath[] = []

  for (const box of boxes) {
    if (box.kind === 'circle') holes.push(circleHole(box))
    else if (touchesBoundary(shape, box)) notches.push(buildNotch(shape, box))
    else holes.push(rectangleHole(box))
  }
  return { outer: outerPath(shape, notches), holes }
}
