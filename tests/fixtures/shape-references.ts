import type { CornerName, CornerTreatment, Cutout, RectangleCutout, CircleCutout, ShapedShape } from '../../src/core/model'

export type EdgeU = 'left' | 'right'
export type EdgeV = 'bottom' | 'top'

export const STRAIGHT: CornerTreatment = { kind: 'straight' }

export function round(radius: number): CornerTreatment {
  return { kind: 'round', radius }
}

export function chamfer(size: number): CornerTreatment {
  return { kind: 'chamfer', size }
}

export function shaped(
  length: number,
  width: number,
  corners: Partial<Record<CornerName, CornerTreatment>> = {},
  cutouts: Cutout[] = []
): ShapedShape {
  return {
    kind: 'shaped',
    length,
    width,
    corners: { bottomLeft: STRAIGHT, bottomRight: STRAIGHT, topRight: STRAIGHT, topLeft: STRAIGHT, ...corners },
    cutouts
  }
}

export function box(
  id: string,
  sizeU: number,
  sizeV: number,
  fromU: [EdgeU, number],
  fromV: [EdgeV, number],
  cornerRadius = 0
): RectangleCutout {
  return {
    id,
    kind: 'rectangle',
    sizeU,
    sizeV,
    cornerRadius,
    fromU: { edge: fromU[0], distance: fromU[1] },
    fromV: { edge: fromV[0], distance: fromV[1] }
  }
}

export function circle(id: string, diameter: number, fromU: [EdgeU, number], fromV: [EdgeV, number]): CircleCutout {
  return {
    id,
    kind: 'circle',
    diameter,
    fromU: { edge: fromU[0], distance: fromU[1] },
    fromV: { edge: fromV[0], distance: fromV[1] }
  }
}

/** Exemple de référence du modèle de données : tablette de 800 × 300 mm. */
export const TABLET: ShapedShape = shaped(
  8000,
  3000,
  { topLeft: round(400), topRight: round(400) },
  [box('notch', 500, 300, ['left', 0], ['bottom', 0]), circle('hole', 600, ['left', 1500], ['bottom', 1500])]
)

const W = 8000
const H = 3000

/** Formes impossibles : [cas, forme, fragment attendu dans le message]. */
export const IMPOSSIBLE_SHAPES: ReadonlyArray<[string, ShapedShape, string]> = [
  ['rayon nul', shaped(W, H, { topLeft: round(0) }), 'rayon'],
  ['rayon non entier', shaped(W, H, { topLeft: round(1.5) }), 'rayon'],
  ['chanfrein nul', shaped(W, H, { topLeft: chamfer(0) }), 'chanfrein'],
  // Côté gauche de 300 mm : 200 + 200 ne tiennent pas, 100 au plus pour le second
  ['coins trop grands sur un côté', shaped(W, H, { bottomLeft: round(2000), topLeft: round(2000) }), '100'],
  ['trop de découpes', shaped(W, H, {}, Array.from({ length: 51 }, (_, i) => circle(`c${i}`, 10, ['left', 50 + i * 100], ['bottom', 1500]))), '50'],
  ['identifiants en double', shaped(W, H, {}, [circle('a', 100, ['left', 500], ['bottom', 500]), circle('a', 100, ['left', 2000], ['bottom', 500])]), 'identifiant'],
  ['cote de découpe nulle', shaped(W, H, {}, [box('a', 0, 100, ['left', 100], ['bottom', 100])]), 'cotes'],
  ['diamètre nul', shaped(W, H, {}, [circle('a', 0, ['left', 500], ['bottom', 500])]), 'diamètre'],
  ['distance négative', shaped(W, H, {}, [box('a', 100, 100, ['left', -1], ['bottom', 100])]), 'distance'],
  ['distance hors de la pièce', shaped(W, H, {}, [circle('a', 100, ['left', W + 1], ['bottom', 500])]), 'distance'],
  ['rayon d\'angle trop grand', shaped(W, H, {}, [box('a', 500, 300, ['left', 100], ['bottom', 100], 151)]), 'rayon'],
  ['découpe qui dépasse', shaped(W, H, {}, [box('a', 500, 100, ['left', 7800], ['bottom', 100])]), 'dépasse'],
  ['découpe sur toute la longueur', shaped(W, H, {}, [box('a', W, 100, ['left', 0], ['bottom', 100])]), 'en deux'],
  ['découpe sur toute la largeur', shaped(W, H, {}, [box('a', 100, H, ['left', 500], ['bottom', 0])]), 'en deux'],
  ['cercle qui touche un bord', shaped(W, H, {}, [circle('a', 600, ['left', 300], ['bottom', 1500])]), 'intérieur'],
  ['cercle qui dépasse', shaped(W, H, {}, [circle('a', 600, ['left', 100], ['bottom', 1500])]), 'intérieur'],
  ['rectangles qui se touchent', shaped(W, H, {}, [box('a', 500, 300, ['left', 0], ['bottom', 0]), box('b', 500, 300, ['left', 500], ['bottom', 0])]), 'touchent'],
  ['rectangles qui se recouvrent', shaped(W, H, {}, [box('a', 500, 300, ['left', 100], ['bottom', 100]), box('b', 500, 300, ['left', 400], ['bottom', 200])]), 'touchent'],
  // Cercle de rayon 300 centré à 1500 : son bord gauche est à u = 1200, là où finit le rectangle
  ['rectangle et cercle tangents', shaped(W, H, {}, [box('a', 200, 600, ['left', 1000], ['bottom', 1200]), circle('b', 600, ['left', 1500], ['bottom', 1500])]), 'touchent'],
  ['cercles tangents', shaped(W, H, {}, [circle('a', 600, ['left', 1000], ['bottom', 1500]), circle('b', 600, ['left', 1600], ['bottom', 1500])]), 'touchent'],
  ['découpe sur un coin arrondi', shaped(W, H, { bottomLeft: round(400) }, [box('a', 500, 300, ['left', 0], ['bottom', 0])]), 'coin'],
  ['découpe au contact d\'un chanfrein', shaped(W, H, { bottomLeft: chamfer(400) }, [box('a', 100, 100, ['left', 400], ['bottom', 400])]), 'coin']
]
