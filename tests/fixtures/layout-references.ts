/** Cotes en dixièmes de millimètre. `x` suit la longueur du panneau, `y` sa largeur. */
export interface Size {
  sizeX: number
  sizeY: number
}

export interface HandCase {
  label: string
  /** La surface utile, marge déjà retirée. */
  panel: Size
  kerf: number
  rotate: boolean
  items: Size[]
  /** Calculés à la main. */
  panels: number
  unplaced: number
}

function times(count: number, size: Size): Size[] {
  return Array.from({ length: count }, () => ({ ...size }))
}

const P2000 = { sizeX: 20000, sizeY: 10000 }
const P2500 = { sizeX: 25000, sizeY: 12500 }
const P2800 = { sizeX: 28000, sizeY: 20700 }

export const HAND_CASES: HandCase[] = [
  {
    // 1000 + 1000 = 2000 et 500 + 500 = 1000 : un panneau plein
    label: '4 × 1000 × 500 sur 2000 × 1000, sans trait de scie',
    panel: P2000, kerf: 0, rotate: true, items: times(4, { sizeX: 10000, sizeY: 5000 }), panels: 1, unplaced: 0
  },
  {
    // 1000 + 3 + 1000 > 2000 et 500 + 3 + 500 > 1000 : 1 pièce en long ou 3 tournées (3 × 500 + 2 × 3 = 1506)
    label: '4 × 1000 × 500 sur 2000 × 1000, trait de 3 mm',
    panel: P2000, kerf: 30, rotate: true, items: times(4, { sizeX: 10000, sizeY: 5000 }), panels: 2, unplaced: 0
  },
  {
    // Sans rotation, une seule pièce par panneau
    label: '4 × 1000 × 500 sur 2000 × 1000, trait de 3 mm, sens du fil',
    panel: P2000, kerf: 30, rotate: false, items: times(4, { sizeX: 10000, sizeY: 5000 }), panels: 4, unplaced: 0
  },
  {
    label: 'pièce égale au panneau, trait de 3 mm',
    panel: P2000, kerf: 30, rotate: true, items: [{ sizeX: 20000, sizeY: 10000 }], panels: 1, unplaced: 0
  },
  {
    // 998,5 + 3 + 998,5 = 2000 exactement
    label: 'deux pièces et un trait de scie égaux au panneau',
    panel: P2000, kerf: 30, rotate: true, items: times(2, { sizeX: 9985, sizeY: 10000 }), panels: 1, unplaced: 0
  },
  {
    // 3 × 800 + 2 × 3 = 2406 ≤ 2500 et 3 × 400 + 2 × 3 = 1206 ≤ 1250
    label: '9 × 800 × 400 sur 2500 × 1250, trait de 3 mm',
    panel: P2500, kerf: 30, rotate: true, items: times(9, { sizeX: 8000, sizeY: 4000 }), panels: 1, unplaced: 0
  },
  {
    label: '10 × 800 × 400 sur 2500 × 1250, trait de 3 mm',
    panel: P2500, kerf: 30, rotate: true, items: times(10, { sizeX: 8000, sizeY: 4000 }), panels: 2, unplaced: 0
  },
  {
    label: 'pièce de 3000 × 500, trop longue pour 2800 × 2070',
    panel: P2800, kerf: 30, rotate: true, items: [{ sizeX: 30000, sizeY: 5000 }], panels: 0, unplaced: 1
  },
  {
    label: 'pièce de 500 × 1500, qui ne rentre que tournée, rotation permise',
    panel: P2000, kerf: 30, rotate: true, items: [{ sizeX: 5000, sizeY: 15000 }], panels: 1, unplaced: 0
  },
  {
    label: 'pièce de 500 × 1500, qui ne rentre que tournée, sens du fil',
    panel: P2000, kerf: 30, rotate: false, items: [{ sizeX: 5000, sizeY: 15000 }], panels: 0, unplaced: 1
  },
  {
    label: 'aucune pièce',
    panel: P2000, kerf: 30, rotate: true, items: [], panels: 0, unplaced: 0
  }
]

export interface RealisticCase {
  label: string
  panel: Size
  kerf: number
  items: Size[]
}

/** Générateur pseudo-aléatoire à graine fixe : les mêmes meubles à chaque exécution. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Kind = 'cuisine' | 'bibliothèque' | 'dressing' | 'tiroirs'

/** Les pièces d'un caisson de 18 mm avec fond de 5 mm : 2 côtés, dessus, dessous et étagères. */
function caisson(items: Size[], width: number, height: number, depth: number, shelves: number): void {
  const pieceDepth = depth - 50
  items.push(...times(2, { sizeX: height, sizeY: pieceDepth }))
  items.push(...times(2 + shelves, { sizeX: width - 360, sizeY: pieceDepth }))
}

function furniture(random: () => number, kind: Kind, count: number): Size[] {
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)]!
  const items: Size[] = []
  for (let index = 0; index < count; index++) {
    if (kind === 'cuisine') {
      const width = pick([3000, 4000, 4500, 5000, 6000, 8000, 9000, 10000])
      caisson(items, width, 7200, 5800, pick([0, 1, 1, 2]))
      if (random() < 0.5) items.push({ sizeX: width - 40, sizeY: 7160 })
    } else if (kind === 'bibliothèque') {
      caisson(items, pick([6000, 8000, 10000]), pick([18000, 20000, 22000]), pick([2500, 3000, 3500]), pick([3, 4, 5, 6]))
    } else if (kind === 'dressing') {
      caisson(items, pick([5000, 6000, 8000, 10000]), 24000, 6000, pick([2, 3, 4]))
    } else {
      const width = pick([4000, 5000, 6000, 8000])
      caisson(items, width, 8000, 5000, 0)
      const drawers = pick([3, 4, 5])
      for (let drawer = 0; drawer < drawers; drawer++) {
        items.push({ sizeX: width - 40, sizeY: 1500 }, ...times(2, { sizeX: 4500, sizeY: 1200 }), ...times(2, { sizeX: width - 500, sizeY: 1200 }))
      }
    }
  }
  return items
}

/** 56 meubles réalistes, de 1 à 20 caissons, sur deux tailles de panneau courantes, avec un trait de 3 mm. */
export function realisticCases(): RealisticCase[] {
  const random = seeded(42)
  const cases: RealisticCase[] = []
  for (const kind of ['cuisine', 'bibliothèque', 'dressing', 'tiroirs'] as const) {
    for (const panel of [P2800, P2500]) {
      for (const count of [1, 2, 3, 5, 8, 12, 20]) {
        cases.push({
          label: `${kind}, ${count} caisson${count > 1 ? 's' : ''}, panneau ${panel.sizeX / 10} × ${panel.sizeY / 10}`,
          panel,
          kerf: 30,
          items: furniture(random, kind, count)
        })
      }
    }
  }
  return cases
}

/** 200 pièces toutes différentes, pour mesurer le temps de calcul. */
export function twoHundredDistinctPieces(): Size[] {
  const random = seeded(7)
  return Array.from({ length: 200 }, () => ({
    sizeX: 3000 + Math.round(random() * 15000),
    sizeY: 1000 + Math.round(random() * 5000)
  }))
}
