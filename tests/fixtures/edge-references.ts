import type { CaissonParams, EdgeName } from '../../src/core/model'

/** Valeurs calculées à la main. Longueurs en dixièmes de millimètre, montants en centimes. */

/** Le caisson de référence : 800 × 1800 × 400, bois de 18, fond de 5, 3 étagères. */
export const REFERENCE_PARAMS: CaissonParams = {
  width: 8000,
  height: 18000,
  depth: 4000,
  boardThickness: 180,
  backThickness: 50,
  shelfCount: 3
}

/** Bords avant chantés : 2 côtés de 1800 et 5 pièces de 764 (dessous, dessus, 3 étagères). */
export const FRONT_EDGES = {
  edgeCount: 7,
  /** 2 × 18 000 + 5 × 7 640 = 74 200, soit 7,42 m. */
  length: 74_200,
  /** 74 200 + 7 × 200 = 75 600, soit 7,56 m. */
  lengthWithOverhang: 75_600,
  overhang: 200
}

/** Étagère de 764 × 395 avec un chant de 2 mm (20 dixièmes). */
export const SHELF = { length: 7640, width: 3950, edgeThickness: 20 }

export const CUT_EXAMPLES: ReadonlyArray<{ edges: EdgeName[]; length: number; width: number }> = [
  { edges: [], length: 7640, width: 3950 },
  // Un chant sur un bord bas réduit la largeur : 3950 − 20
  { edges: ['bottom'], length: 7640, width: 3930 },
  { edges: ['bottom', 'top'], length: 7640, width: 3910 },
  // Les bords gauche et droit réduisent la longueur : 7640 − 2 × 20
  { edges: ['left', 'right'], length: 7600, width: 3950 },
  { edges: ['bottom', 'left', 'right'], length: 7600, width: 3930 },
  { edges: ['bottom', 'top', 'left', 'right'], length: 7600, width: 3910 }
]

/** L'exemple de la spec : 2 panneaux à 45,90 € et 7,56 m de chant à 0,85 €/m. */
export const SPEC_COST = {
  panels: 2,
  panelPrice: 4590,
  edgeCentimeters: 756,
  edgePrice: 85,
  /** 2 × 4 590 */
  panelsAmount: 9180,
  /** 756 × 85 / 100 = 642,6, arrondi à 643 */
  edgeAmount: 643,
  /** 9 180 + 643 */
  total: 9823
}

/**
 * Le scénario C5 : le caisson de référence aux bords avant chantés, surlongueur de 20 mm, panneaux par défaut.
 * Le calepinage donne 1 panneau de 18 mm et 1 panneau de 5 mm.
 */
export const QUICKSTART_COST = {
  panel18Price: 4590,
  edgePrice: 85,
  panel5Price: 1200,
  /** 4 590 + 643 + 1 200 */
  total: 6433,
  /** Sans le prix du panneau de 5 mm : 4 590 + 643 */
  partialTotal: 5233
}
