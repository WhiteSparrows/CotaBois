import type { DrawerParams } from '../../src/core/model'

/** Valeurs calculées à la main, en dixièmes de millimètre. */

/** 600 × 720 × 560, bois de 18, fond de 5, 3 tiroirs, réglages par défaut. */
export const REFERENCE_DRAWERS: DrawerParams = {
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

export interface ExpectedDrawerLine {
  quantity: number
  length: number
  width: number
  thickness: number
}

/**
 * Profondeur des pièces du caisson : 5600 − 50 = 5550 ; largeur intérieure : 6000 − 2 × 180 = 5640.
 * Façades : 6000 − 30 = 5970 de large, (7200 − 3 × 30) / 3 = 2370 de haut.
 * Boîtes : 5640 − 2 × 125 = 5390 de large, 2370 − 400 = 1970 de haut, ⌊(5550 − 100) / 500⌋ × 500 = 5000 de profondeur.
 * Avant et arrière : 5390 − 2 × 150 = 5090.
 */
export const REFERENCE_DRAWER_LINES: ExpectedDrawerLine[] = [
  { quantity: 2, length: 7200, width: 5550, thickness: 180 },
  { quantity: 3, length: 5970, width: 2370, thickness: 180 },
  { quantity: 2, length: 5640, width: 5550, thickness: 180 },
  { quantity: 6, length: 5090, width: 1970, thickness: 150 },
  { quantity: 6, length: 5000, width: 1970, thickness: 150 },
  { quantity: 1, length: 7200, width: 6000, thickness: 50 },
  { quantity: 3, length: 5390, width: 5000, thickness: 50 }
]

export const REFERENCE_PIECE_COUNT = 23

/** Positions clés du meuble de référence. */
export const REFERENCE_POSITIONS = {
  /** La façade du bas commence à ⌊30 / 2⌋ = 15, celle du haut à 15 + 2 × (2370 + 30) = 4815. */
  bottomFrontY: 15,
  topFrontY: 4815,
  frontX: 15,
  /** Devant le caisson. */
  frontZ: 5600,
  /** Tiroir centré sur sa façade : 15 + ⌊(2370 − 1970 − 50) / 2⌋ = 190, au-dessus du dessous (180). */
  bottomDrawerBottomY: 190,
  /** 4815 + 175 + 50 + 1970 = 7010, sous le dessus (7200 − 180 = 7020). */
  topDrawerTopY: 7010,
  /** 180 + 125 */
  drawerX: 305,
  /** Les boîtes finissent au ras de l'avant du caisson : 5600 − 5000. */
  drawerZ: 600
}

/** 721 mm de haut : (7210 − 90) / 3 = 2373,33… ; deux façades de 2373, celle du bas de 2374, côtés de 1973. */
export const TALL_DRAWERS: DrawerParams = { ...REFERENCE_DRAWERS, height: 7210 }
export const TALL_FRONT_HEIGHTS = { top: 2373, middle: 2373, bottom: 2374 }
export const TALL_DRAWER_SIDE_HEIGHT = 1973

/** Refus, avec le champ en cause et ce que le message doit contenir. */
export const DRAWER_REFUSALS: ReadonlyArray<{ label: string; params: DrawerParams; field: keyof DrawerParams; contains: string }> = [
  // (7200 − 300) / 10 − 400 = 290 < 500 ; au plus 7, car (7200 − 240) / 8 − 400 = 470 < 500
  { label: '10 tiroirs sur 720 mm', params: { ...REFERENCE_DRAWERS, drawerCount: 10 }, field: 'drawerCount', contains: '7' },
  // ⌊(2450 − 100) / 500⌋ × 500 = 2000 < 2500 ; au moins 50 + 100 + 2500 = 2650
  { label: 'profondeur de 250 mm', params: { ...REFERENCE_DRAWERS, depth: 2500 }, field: 'depth', contains: '265' },
  // 800 − 360 − 250 = 190 de boîte, moins 2 × 150 : rien pour l'avant
  { label: 'largeur de 80 mm', params: { ...REFERENCE_DRAWERS, width: 800 }, field: 'width', contains: 'largeur' },
  // Le fond du tiroir du bas, à 190, toucherait le dessous de 250
  { label: 'bois de 25 mm', params: { ...REFERENCE_DRAWERS, boardThickness: 250 }, field: 'boardThickness', contains: 'touche' },
  { label: '0 tiroir', params: { ...REFERENCE_DRAWERS, drawerCount: 0 }, field: 'drawerCount', contains: '1 à 10' },
  { label: '11 tiroirs', params: { ...REFERENCE_DRAWERS, drawerCount: 11 }, field: 'drawerCount', contains: '1 à 10' },
  { label: 'jeu entre façades de 10,1 mm', params: { ...REFERENCE_DRAWERS, frontGap: 101 }, field: 'frontGap', contains: '10 mm' },
  { label: 'jeu des coulisses de 50,1 mm', params: { ...REFERENCE_DRAWERS, slideGap: 501 }, field: 'slideGap', contains: '50 mm' },
  { label: 'fond plus profond que le meuble', params: { ...REFERENCE_DRAWERS, backThickness: 5600 }, field: 'backThickness', contains: 'profondeur' },
  { label: 'bois des tiroirs nul', params: { ...REFERENCE_DRAWERS, drawerThickness: 0 }, field: 'drawerThickness', contains: 'tiroirs' }
]
