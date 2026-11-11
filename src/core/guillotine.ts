import type { Tenths } from './units'

/**
 * Placement de rectangles sur des panneaux identiques, uniquement en coupes traversantes : chaque coupe
 * sépare en deux le morceau en cours, d'un bord à l'autre. Tout est en entiers, et le résultat ne
 * dépend que des arguments. `x` suit la longueur du panneau, `y` sa largeur.
 */

export interface PackItem {
  sizeX: Tenths
  sizeY: Tenths
}

export interface PackRect {
  x: Tenths
  y: Tenths
  sizeX: Tenths
  sizeY: Tenths
}

export interface PackPlacement extends PackRect {
  /** La position de la pièce dans la liste reçue. */
  index: number
  /** Vrai si `sizeX` de la pièce suit la largeur du panneau. */
  rotated: boolean
}

/** `along` : parallèle à la longueur du panneau, donc à `y` constant ; `across` : à `x` constant. */
export type CutDirection = 'along' | 'across'

export interface PackCut {
  direction: CutDirection
  /** La ligne de coupe ; le trait de scie est juste après elle. */
  at: Tenths
  from: Tenths
  to: Tenths
  /** La distance au bord du morceau coupé : la cote à reporter sur la scie. */
  offset: Tenths
}

export interface PackedPanel {
  placements: PackPlacement[]
  offcuts: PackRect[]
  /** Dans l'ordre où les faire. */
  cuts: PackCut[]
}

export interface PackResult {
  panels: PackedPanel[]
  /** Les pièces qui ne tiennent pas sur un panneau vide. */
  unplaced: number[]
}

export interface PackOptions {
  kerf: Tenths
  rotate: boolean
  /** Le nombre d'essais après les essais systématiques. */
  runs: number
}

/** Le nombre total de placements, au-delà des essais systématiques, réparti entre toutes les pièces du meuble. */
export const LAYOUT_BUDGET = 30_000
const MAX_RUNS = 4000

export function iterationsFor(pieceCount: number): number {
  return Math.min(MAX_RUNS, Math.floor(LAYOUT_BUDGET / Math.max(1, pieceCount)))
}

interface Item {
  index: number
  sizeX: Tenths
  sizeY: Tenths
}

interface Node extends PackRect {
  cut: { direction: CutDirection; at: Tenths; from: Tenths; to: Tenths; offset: Tenths } | null
  first: Node | null
  second: Node | null
  /** -1 pour un morceau libre. */
  index: number
  rotated: boolean
}

interface Bin {
  root: Node
  free: Node[]
  used: number
}

interface Rule {
  choice: number
  split: number
  firstBin: boolean
}

interface Attempt {
  bins: Bin[]
  order: Item[]
  rule: Rule
  /** Moins de panneaux, puis la plus grande chute. */
  score: [number, number]
}

const longSide = (item: Item) => Math.max(item.sizeX, item.sizeY)
const shortSide = (item: Item) => Math.min(item.sizeX, item.sizeY)

const SORTS: ReadonlyArray<(a: Item, b: Item) => number> = [
  (a, b) => b.sizeX * b.sizeY - a.sizeX * a.sizeY,
  (a, b) => longSide(b) - longSide(a) || shortSide(b) - shortSide(a),
  (a, b) => shortSide(b) - shortSide(a) || longSide(b) - longSide(a),
  (a, b) => b.sizeX + b.sizeY - a.sizeX - a.sizeY,
  (a, b) => b.sizeX - a.sizeX || b.sizeY - a.sizeY,
  (a, b) => b.sizeY - a.sizeY || b.sizeX - a.sizeX
]

/** Le morceau libre choisi est celui dont le score est le plus petit. */
const CHOICES: ReadonlyArray<(free: PackRect, sizeX: Tenths, sizeY: Tenths) => [number, number]> = [
  (free, sizeX, sizeY) => [Math.min(free.sizeX - sizeX, free.sizeY - sizeY), Math.max(free.sizeX - sizeX, free.sizeY - sizeY)],
  (free, sizeX, sizeY) => [Math.max(free.sizeX - sizeX, free.sizeY - sizeY), Math.min(free.sizeX - sizeX, free.sizeY - sizeY)],
  (free, sizeX, sizeY) => [free.sizeX * free.sizeY - sizeX * sizeY, Math.min(free.sizeX - sizeX, free.sizeY - sizeY)]
]

/** Vrai : la première coupe est en long, sur toute la longueur du morceau. */
const SPLITS: ReadonlyArray<(free: PackRect, sizeX: Tenths, sizeY: Tenths) => boolean> = [
  () => true,
  () => false,
  (free) => free.sizeX < free.sizeY,
  (free) => free.sizeX >= free.sizeY,
  (free, sizeX, sizeY) => free.sizeX - sizeX < free.sizeY - sizeY,
  (free, sizeX, sizeY) => free.sizeX - sizeX >= free.sizeY - sizeY
]

/** Pseudo-aléatoire à graine fixe : le même meuble donne toujours le même placement. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function freeNode(x: Tenths, y: Tenths, sizeX: Tenths, sizeY: Tenths): Node {
  return { x, y, sizeX, sizeY, cut: null, first: null, second: null, index: -1, rotated: false }
}

function isBetter(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])
}

interface Noise {
  random: () => number
  probability: number
}

class Packer {
  constructor(
    private readonly panel: PackItem,
    private readonly kerf: Tenths,
    private readonly rotate: boolean
  ) {}

  pack(order: Item[], rule: Rule, noise: Noise | null): Attempt {
    const bins: Bin[] = []
    const choose = CHOICES[rule.choice]!
    for (const item of order) {
      let best: { bin: Bin; at: number; sizeX: Tenths; sizeY: Tenths; rotated: boolean; score: [number, number] } | null = null
      const consider = (bin: Bin) => {
        bin.free.forEach((free, at) => {
          for (let turn = 0; turn < (this.rotate && item.sizeX !== item.sizeY ? 2 : 1); turn++) {
            const sizeX = turn === 0 ? item.sizeX : item.sizeY
            const sizeY = turn === 0 ? item.sizeY : item.sizeX
            if (sizeX > free.sizeX || sizeY > free.sizeY) continue
            const score = choose(free, sizeX, sizeY)
            if (!best || isBetter(score, best.score)) best = { bin, at, sizeX, sizeY, rotated: turn === 1, score }
          }
        })
      }
      for (const bin of bins) {
        consider(bin)
        if (best && rule.firstBin) break
      }
      if (!best) {
        const bin: Bin = { root: freeNode(0, 0, this.panel.sizeX, this.panel.sizeY), free: [], used: 0 }
        bin.free.push(bin.root)
        bins.push(bin)
        consider(bin)
      }
      const chosen = best as unknown as { bin: Bin; at: number; sizeX: Tenths; sizeY: Tenths; rotated: boolean }
      const free = chosen.bin.free[chosen.at]!
      const alongFirst =
        noise && noise.random() < noise.probability ? noise.random() < 0.5 : SPLITS[rule.split]!(free, chosen.sizeX, chosen.sizeY)
      chosen.bin.free.splice(chosen.at, 1)
      this.place(chosen.bin, free, item.index, chosen.sizeX, chosen.sizeY, chosen.rotated, alongFirst)
    }

    let largestFree = 0
    for (const bin of bins) for (const free of bin.free) largestFree = Math.max(largestFree, free.sizeX * free.sizeY)
    return { bins, order, rule, score: [bins.length, -largestFree] }
  }

  /** Coupe le morceau en deux ; le second n'existe que s'il reste de la matière au-delà du trait de scie. */
  private split(bin: Bin, node: Node, direction: CutDirection, size: Tenths): Node {
    const k = this.kerf
    if (direction === 'along') {
      node.cut = { direction, at: node.y + size, from: node.x, to: node.x + node.sizeX, offset: size }
      node.first = freeNode(node.x, node.y, node.sizeX, size)
      const rest = node.sizeY - size - k
      node.second = rest > 0 ? freeNode(node.x, node.y + size + k, node.sizeX, rest) : null
    } else {
      node.cut = { direction, at: node.x + size, from: node.y, to: node.y + node.sizeY, offset: size }
      node.first = freeNode(node.x, node.y, size, node.sizeY)
      const rest = node.sizeX - size - k
      node.second = rest > 0 ? freeNode(node.x + size + k, node.y, rest, node.sizeY) : null
    }
    if (node.second) bin.free.push(node.second)
    return node.first
  }

  private place(bin: Bin, free: Node, index: number, sizeX: Tenths, sizeY: Tenths, rotated: boolean, alongFirst: boolean): void {
    let target = free
    if (alongFirst) {
      if (target.sizeY > sizeY) target = this.split(bin, target, 'along', sizeY)
      if (target.sizeX > sizeX) target = this.split(bin, target, 'across', sizeX)
    } else {
      if (target.sizeX > sizeX) target = this.split(bin, target, 'across', sizeX)
      if (target.sizeY > sizeY) target = this.split(bin, target, 'along', sizeY)
    }
    target.index = index
    target.rotated = rotated
    bin.used += sizeX * sizeY
  }
}

function flatten(bin: Bin): PackedPanel {
  const panel: PackedPanel = { placements: [], offcuts: [], cuts: [] }
  const visit = (node: Node): void => {
    if (node.cut) {
      panel.cuts.push({ ...node.cut })
      visit(node.first!)
      if (node.second) visit(node.second)
    } else if (node.index >= 0) {
      panel.placements.push({ index: node.index, x: node.x, y: node.y, sizeX: node.sizeX, sizeY: node.sizeY, rotated: node.rotated })
    } else {
      panel.offcuts.push({ x: node.x, y: node.y, sizeX: node.sizeX, sizeY: node.sizeY })
    }
  }
  visit(bin.root)
  return panel
}

export function packPanels(items: readonly PackItem[], panel: PackItem, options: PackOptions): PackResult {
  const { kerf, rotate } = options
  const fits = (item: PackItem) =>
    (item.sizeX <= panel.sizeX && item.sizeY <= panel.sizeY) || (rotate && item.sizeY <= panel.sizeX && item.sizeX <= panel.sizeY)

  const unplaced: number[] = []
  const placeable: Item[] = []
  items.forEach((item, index) => {
    if (fits(item)) placeable.push({ index, sizeX: item.sizeX, sizeY: item.sizeY })
    else unplaced.push(index)
  })
  if (placeable.length === 0) return { panels: [], unplaced }

  const packer = new Packer(panel, kerf, rotate)

  // Essais systématiques : chaque tri, chaque choix de morceau, chaque règle de coupe.
  let best: Attempt | null = null
  for (const sort of SORTS) {
    const order = [...placeable].sort((a, b) => sort(a, b) || a.index - b.index)
    for (let choice = 0; choice < CHOICES.length; choice++) {
      for (let split = 0; split < SPLITS.length; split++) {
        for (const firstBin of [false, true]) {
          const attempt = packer.pack(order, { choice, split, firstBin }, null)
          if (!best || isBetter(attempt.score, best.score)) best = attempt
        }
      }
    }
  }

  // Reprise : les pièces du panneau le moins rempli passent en tête, pour tenter de le vider.
  const random = seeded(12345)
  const noise: Noise = { random, probability: 0.15 }
  const pick = (count: number) => Math.floor(random() * count)
  let current = best!
  for (let run = 0; run < options.runs; run++) {
    const bins = [...current.bins].sort((a, b) => a.used - b.used)
    const front = new Set<number>()
    for (const node of collectPieces(bins[0]!.root)) front.add(node)
    if (bins.length > 1 && random() < 0.5) for (const node of collectPieces(bins[1 + pick(bins.length - 1)]!.root)) front.add(node)

    const head = current.order.filter((item) => front.has(item.index))
    const rest = current.order.filter((item) => !front.has(item.index))
    for (let i = head.length - 1; i > 0; i--) {
      const j = pick(i + 1)
      ;[head[i], head[j]] = [head[j]!, head[i]!]
    }
    const swaps = 1 + pick(4)
    for (let swap = 0; swap < swaps && rest.length > 1; swap++) {
      const a = pick(rest.length)
      const b = pick(rest.length)
      ;[rest[a], rest[b]] = [rest[b]!, rest[a]!]
    }
    let order: Item[]
    if (random() < 0.5) {
      order = [...head, ...rest]
    } else {
      order = [...rest]
      for (const item of head) order.splice(pick(order.length + 1), 0, item)
    }
    const rule =
      random() < 0.6 ? current.rule : { choice: pick(CHOICES.length), split: pick(SPLITS.length), firstBin: random() < 0.3 }

    const attempt = packer.pack(order, rule, noise)
    if (isBetter(attempt.score, best!.score)) best = attempt
    if (!isBetter(current.score, attempt.score)) current = attempt
    else if (random() < 0.02) current = best!
  }

  return { panels: best!.bins.map(flatten), unplaced }
}

function collectPieces(root: Node): number[] {
  const indexes: number[] = []
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.cut) {
      stack.push(node.first!)
      if (node.second) stack.push(node.second)
    } else if (node.index >= 0) {
      indexes.push(node.index)
    }
  }
  return indexes
}
