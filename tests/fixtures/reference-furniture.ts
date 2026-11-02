import type { CaissonParams } from '../../src/core/model'

export interface ExpectedLine {
  quantity: number
  names: string[]
  /** Cotes en dixièmes de millimètre, calculées à la main. */
  length: number
  width: number
  thickness: number
}

export interface ReferenceCaisson {
  label: string
  params: CaissonParams
  lines: ExpectedLine[]
  pieceCount: number
}

export const REFERENCE_CAISSONS: ReferenceCaisson[] = [
  {
    // Profondeur des pièces : 400 − 5 = 395 ; largeur intérieure : 800 − 2 × 18 = 764
    label: 'caisson de référence, 800 × 1800 × 400, fond de 5, 3 étagères',
    params: { width: 8000, height: 18000, depth: 4000, boardThickness: 180, backThickness: 50, shelfCount: 3 },
    pieceCount: 8,
    lines: [
      { quantity: 2, names: ['Côté gauche', 'Côté droit'], length: 18000, width: 3950, thickness: 180 },
      {
        quantity: 5,
        names: ['Dessous', 'Dessus', 'Étagère 1', 'Étagère 2', 'Étagère 3'],
        length: 7640,
        width: 3950,
        thickness: 180
      },
      { quantity: 1, names: ['Fond'], length: 18000, width: 8000, thickness: 50 }
    ]
  },
  {
    // Sans fond, les pièces gardent toute la profondeur : 400
    label: 'caisson sans fond',
    params: { width: 8000, height: 18000, depth: 4000, boardThickness: 180, backThickness: 0, shelfCount: 3 },
    pieceCount: 7,
    lines: [
      { quantity: 2, names: ['Côté gauche', 'Côté droit'], length: 18000, width: 4000, thickness: 180 },
      {
        quantity: 5,
        names: ['Dessous', 'Dessus', 'Étagère 1', 'Étagère 2', 'Étagère 3'],
        length: 7640,
        width: 4000,
        thickness: 180
      }
    ]
  },
  {
    // 600 − 2 × 22 = 556 ; 350 − 8 = 342
    label: 'caisson sans étagère',
    params: { width: 6000, height: 7200, depth: 3500, boardThickness: 220, backThickness: 80, shelfCount: 0 },
    pieceCount: 5,
    lines: [
      { quantity: 2, names: ['Côté gauche', 'Côté droit'], length: 7200, width: 3420, thickness: 220 },
      { quantity: 2, names: ['Dessous', 'Dessus'], length: 5560, width: 3420, thickness: 220 },
      { quantity: 1, names: ['Fond'], length: 7200, width: 6000, thickness: 80 }
    ]
  },
  {
    // 450,5 − 2 × 18,5 = 413,5 ; 300,5 − 3,5 = 297
    label: 'caisson à cotes décimales',
    params: { width: 4505, height: 12005, depth: 3005, boardThickness: 185, backThickness: 35, shelfCount: 1 },
    pieceCount: 6,
    lines: [
      { quantity: 2, names: ['Côté gauche', 'Côté droit'], length: 12005, width: 2970, thickness: 185 },
      { quantity: 3, names: ['Dessous', 'Dessus', 'Étagère 1'], length: 4135, width: 2970, thickness: 185 },
      { quantity: 1, names: ['Fond'], length: 12005, width: 4505, thickness: 35 }
    ]
  },
  {
    // Plus large que haut : le dessus devient plus long que les côtés, et le fond reste 1000 × 2000
    label: 'caisson plus large que haut',
    params: { width: 20000, height: 10000, depth: 5000, boardThickness: 200, backThickness: 100, shelfCount: 0 },
    pieceCount: 5,
    lines: [
      { quantity: 2, names: ['Dessous', 'Dessus'], length: 19600, width: 4900, thickness: 200 },
      { quantity: 2, names: ['Côté gauche', 'Côté droit'], length: 10000, width: 4900, thickness: 200 },
      { quantity: 1, names: ['Fond'], length: 20000, width: 10000, thickness: 100 }
    ]
  }
]
