import { describe, expect, it } from 'vitest'
import type { ShapedShape } from '../../src/core/model'
import {
  asShaped,
  maxCornerSize,
  normalizeShape,
  resolveCutout,
  shapeContains,
  shapeOutline,
  validateShape,
  type OutlinePath
} from '../../src/core/shape'
import { box, chamfer, circle, IMPOSSIBLE_SHAPES, round, shaped, TABLET } from '../fixtures/shape-references'

describe('validateShape', () => {
  it('accepte la tablette de référence', () => {
    expect(validateShape(TABLET)).toEqual({ ok: true, value: TABLET })
  })

  it.each(IMPOSSIBLE_SHAPES.map(([label, shape, fragment]) => [label, shape, fragment] as const))(
    'refuse : %s',
    (_label, shape, fragment) => {
      const result = validateShape(shape)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.message).toContain(fragment)
    }
  )

  it('accepte 50 découpes', () => {
    const cutouts = Array.from({ length: 50 }, (_, i) => circle(`c${i}`, 50, ['left', 100 + i * 150], ['bottom', 1500]))
    expect(validateShape(shaped(8000, 3000, {}, cutouts)).ok).toBe(true)
  })

  it('accepte deux coins qui occupent exactement un côté', () => {
    expect(validateShape(shaped(8000, 3000, { bottomLeft: round(1500), topLeft: round(1500) })).ok).toBe(true)
    expect(validateShape(shaped(8000, 3000, { bottomLeft: round(1501), topLeft: round(1500) })).ok).toBe(false)
  })

  it('accepte un rayon d\'angle égal à la moitié du plus petit côté', () => {
    expect(validateShape(shaped(8000, 3000, {}, [box('a', 500, 300, ['left', 100], ['bottom', 100], 150)])).ok).toBe(true)
  })

  it('accepte des découpes proches qui ne se touchent pas', () => {
    expect(
      validateShape(shaped(8000, 3000, {}, [box('a', 500, 300, ['left', 0], ['bottom', 0]), box('b', 500, 300, ['left', 501], ['bottom', 0])])).ok
    ).toBe(true)
  })

  it('vérifie exactement un trou de diamètre impair', () => {
    // Rayon de 30,5 dixièmes centré à 31 : il reste un demi-dixième au bord
    expect(validateShape(shaped(8000, 3000, {}, [circle('a', 61, ['left', 31], ['bottom', 1500])])).ok).toBe(true)
    // Centré à 30 : il dépasserait d'un demi-dixième
    expect(validateShape(shaped(8000, 3000, {}, [circle('a', 61, ['left', 30], ['bottom', 1500])])).ok).toBe(false)
  })

  it('tient compte des bords de référence droit et haut', () => {
    expect(validateShape(shaped(8000, 3000, {}, [box('a', 500, 300, ['right', 0], ['top', 0])])).ok).toBe(true)
    expect(validateShape(shaped(8000, 3000, {}, [box('a', 500, 300, ['right', 7700], ['top', 0])])).ok).toBe(false)
  })

  it('accepte des découpes juste à côté d\'un coin modifié, et refuse le contact', () => {
    const near = (distance: number) => shaped(8000, 3000, { bottomLeft: round(400) }, [box('a', 100, 100, ['left', distance], ['bottom', 0])])
    expect(validateShape(near(401)).ok).toBe(true)
    expect(validateShape(near(400)).ok).toBe(false)
  })

  it('indique la découpe en cause', () => {
    const result = validateShape(shaped(8000, 3000, {}, [box('fautive', 500, 100, ['left', 7800], ['bottom', 100])]))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe('cutouts.fautive')
  })
})

describe('normalizeShape et asShaped', () => {
  it('ramène à un rectangle sans modification', () => {
    expect(normalizeShape(shaped(8000, 3000))).toEqual({ kind: 'rectangle', length: 8000, width: 3000 })
  })

  it('garde une forme réelle', () => {
    expect(normalizeShape(TABLET)).toBe(TABLET)
  })

  it('présente un rectangle comme une forme sans modification', () => {
    expect(asShaped({ kind: 'rectangle', length: 8000, width: 3000 })).toEqual(shaped(8000, 3000))
  })
})

describe('maxCornerSize', () => {
  it('reprend l\'exemple de référence : 1199 à cause du trou', () => {
    expect(maxCornerSize(TABLET, 'topLeft')).toBe(1199)
  })

  it('sans découpe, est limité par la place sur chaque côté', () => {
    const shape = shaped(8000, 3000, { topLeft: round(400) })
    expect(maxCornerSize(shape, 'bottomLeft')).toBe(2600)
    expect(maxCornerSize(shape, 'topRight')).toBe(3000)
    expect(maxCornerSize(shape, 'topLeft')).toBe(3000)
  })

  it('vaut 0 quand une découpe occupe le coin', () => {
    expect(maxCornerSize(TABLET, 'bottomLeft')).toBe(0)
  })
})

describe('resolveCutout', () => {
  it('place un rectangle depuis chaque couple de bords', () => {
    expect(resolveCutout(shaped(8000, 3000), box('a', 500, 300, ['left', 100], ['bottom', 200]))).toMatchObject({ minU: 100, maxU: 600, minV: 200, maxV: 500 })
    expect(resolveCutout(shaped(8000, 3000), box('a', 500, 300, ['right', 100], ['top', 200]))).toMatchObject({ minU: 7400, maxU: 7900, minV: 2500, maxV: 2800 })
  })

  it('place un cercle par son centre', () => {
    expect(resolveCutout(shaped(8000, 3000), circle('a', 600, ['left', 1500], ['top', 1000]))).toMatchObject({
      centerU: 1500,
      centerV: 2000,
      radius: 300,
      minU: 1200,
      maxU: 1800,
      minV: 1700,
      maxV: 2300
    })
  })
})

describe('shapeContains', () => {
  const shape = shaped(
    8000,
    3000,
    { topLeft: round(400), topRight: chamfer(400) },
    [box('notch', 500, 300, ['left', 0], ['bottom', 0], 100), circle('hole', 600, ['left', 1500], ['bottom', 1500]), box('slot', 800, 400, ['left', 4000], ['bottom', 1000], 100)]
  )

  it.each([
    ['milieu de la pièce', 3000, 2000, true],
    ['hors de la pièce', 8100, 100, false],
    ['dans l\'encoche', 100, 100, false],
    ['à côté de l\'encoche', 600, 100, true],
    ['dans le trou rond', 1500, 1500, false],
    ['à côté du trou rond', 1500, 1850, true],
    ['angle retiré de l\'arrondi', 20, 2980, false],
    ['dans l\'arrondi', 200, 2800, true],
    ['angle retiré du chanfrein', 7950, 2950, false],
    ['au-delà de la diagonale du chanfrein', 7700, 2910, false],
    ['en deçà de la diagonale du chanfrein', 7700, 2600, true],
    ['dans le trou rectangulaire', 4400, 1200, false],
    // L'angle arrondi d'une découpe laisse de la matière dans le coin
    ['coin arrondi d\'un trou', 4005, 1005, true],
    ['coin arrondi de l\'encoche', 495, 295, true]
  ])('%s', (_label, u, v, expected) => {
    expect(shapeContains(shape, u, v)).toBe(expected)
  })

  it('n\'arrondit pas les angles posés sur un bord de la pièce', () => {
    // Coin (500, 0) de l'encoche : sur le bord bas, il reste vif malgré le rayon
    expect(shapeContains(shape, 495, 5)).toBe(false)
  })

  it('accepte un rectangle', () => {
    expect(shapeContains({ kind: 'rectangle', length: 100, width: 50 }, 50, 25)).toBe(true)
    expect(shapeContains({ kind: 'rectangle', length: 100, width: 50 }, 150, 25)).toBe(false)
  })
})

type Point = [number, number]

/** Discrétise un chemin du contour, comme l'affichage. */
function tessellate(path: OutlinePath): Point[] {
  const points: Point[] = [[path.start.u, path.start.v]]
  for (const segment of path.segments) {
    if (segment.kind === 'arc') {
      const steps = 32
      for (let i = 1; i <= steps; i++) {
        const angle = segment.startAngle + ((segment.endAngle - segment.startAngle) * i) / steps
        points.push([segment.center.u + segment.radius * Math.cos(angle), segment.center.v + segment.radius * Math.sin(angle)])
      }
    } else {
      points.push([segment.to.u, segment.to.v])
    }
  }
  return points
}

function insidePolygon(points: Point[], u: number, v: number): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ui, vi] = points[i]!
    const [uj, vj] = points[j]!
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) inside = !inside
  }
  return inside
}

function distanceToPolygon(points: Point[], u: number, v: number): number {
  let best = Infinity
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j]!
    const [bx, by] = points[i]!
    const dx = bx - ax
    const dy = by - ay
    const t = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(u - (ax + t * dx), v - (ay + t * dy)))
  }
  return best
}

const OUTLINE_CASES: ReadonlyArray<[string, ShapedShape]> = [
  ['tablette de référence', TABLET],
  ['coins variés', shaped(6000, 4000, { bottomLeft: round(500), bottomRight: chamfer(300), topRight: round(1000), topLeft: chamfer(800) })],
  ['encoches sur chaque coin', shaped(6000, 4000, {}, [
    box('a', 500, 300, ['left', 0], ['bottom', 0], 50),
    box('b', 500, 300, ['right', 0], ['bottom', 0], 50),
    box('c', 500, 300, ['right', 0], ['top', 0], 50),
    box('d', 500, 300, ['left', 0], ['top', 0], 50)
  ])],
  ['encoches sur chaque bord', shaped(6000, 4000, { bottomLeft: round(200) }, [
    box('a', 500, 300, ['left', 2000], ['bottom', 0], 60),
    box('b', 300, 500, ['right', 0], ['bottom', 1500]),
    box('c', 500, 300, ['left', 2000], ['top', 0]),
    box('d', 300, 500, ['left', 0], ['bottom', 1500], 60)
  ])],
  ['trous variés', shaped(6000, 4000, {}, [box('a', 800, 600, ['left', 1000], ['bottom', 1000], 150), circle('b', 900, ['right', 1500], ['top', 1500])])],
  ['deux arrondis qui se rejoignent', shaped(6000, 3000, { bottomRight: round(1500), topRight: round(1500) })]
]

describe('shapeOutline', () => {
  it.each(OUTLINE_CASES)('décrit la même matière que shapeContains : %s', (_label, shape) => {
    const { outer, holes } = shapeOutline(shape)
    const outerPoints = tessellate(outer)
    const holePoints = holes.map(tessellate)
    const paths = [outerPoints, ...holePoints]

    for (let u = 37; u < shape.length; u += 113) {
      for (let v = 41; v < shape.width; v += 97) {
        // Les points trop proches d'un bord dépendent de la finesse du découpage des arcs.
        if (paths.some((points) => distanceToPolygon(points, u, v) < 5)) continue
        const inOutline = insidePolygon(outerPoints, u, v) && !holePoints.some((points) => insidePolygon(points, u, v))
        expect(inOutline, `point (${u}, ${v})`).toBe(shapeContains(shape, u, v))
      }
    }
  })

  it('ferme chaque chemin sur son point de départ', () => {
    for (const [, shape] of OUTLINE_CASES) {
      const { outer, holes } = shapeOutline(shape)
      for (const path of [outer, ...holes]) {
        const last = path.segments.at(-1)!.to
        expect(Math.hypot(last.u - path.start.u, last.v - path.start.v)).toBeLessThan(1e-6)
      }
    }
  })

  it('ne produit pas de segment de longueur nulle', () => {
    for (const [, shape] of OUTLINE_CASES) {
      const { outer, holes } = shapeOutline(shape)
      for (const path of [outer, ...holes]) {
        let previous = path.start
        for (const segment of path.segments) {
          expect(Math.hypot(segment.to.u - previous.u, segment.to.v - previous.v)).toBeGreaterThan(1e-6)
          previous = segment.to
        }
      }
    }
  })

  it('compte un trou par découpe intérieure', () => {
    expect(shapeOutline(TABLET).holes).toHaveLength(1)
  })

  it('une forme valide reste d\'un seul tenant', () => {
    for (const [label, shape] of OUTLINE_CASES) {
      const step = 25
      const columns = Math.floor(shape.length / step)
      const rows = Math.floor(shape.width / step)
      const solid = (i: number, j: number) => i >= 0 && j >= 0 && i < columns && j < rows && shapeContains(shape, (i + 0.5) * step, (j + 0.5) * step)

      let material = 0
      let start: [number, number] | null = null
      for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
          if (solid(i, j)) {
            material++
            start ??= [i, j]
          }
        }
      }

      const seen = new Set<number>()
      const stack: Array<[number, number]> = start ? [start] : []
      while (stack.length > 0) {
        const [i, j] = stack.pop()!
        const key = i * rows + j
        if (seen.has(key) || !solid(i, j)) continue
        seen.add(key)
        stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1])
      }
      expect(seen.size, label).toBe(material)
    }
  })
})
