import { describe, expect, it } from 'vitest'
import { computeCutList } from '../../src/core/cutList'
import { applyDrawerCabinet, DEFAULT_DRAWER_PARAMS, drawerLayout, maxDrawerCount, validateDrawerParams } from '../../src/core/drawers'
import { findOverlaps, pieceBounds } from '../../src/core/geometry'
import { createEmptyProject, type DrawerParams, type Project } from '../../src/core/model'
import { updatePiece } from '../../src/core/pieces'
import {
  DRAWER_REFUSALS,
  REFERENCE_DRAWER_LINES,
  REFERENCE_DRAWERS,
  REFERENCE_PIECE_COUNT,
  REFERENCE_POSITIONS,
  TALL_DRAWER_SIDE_HEIGHT,
  TALL_DRAWERS,
  TALL_FRONT_HEIGHTS
} from '../fixtures/drawer-references'

function refusal(params: DrawerParams) {
  const result = validateDrawerParams(params)
  if (result.ok) throw new Error('La validation aurait dû échouer')
  return result.error
}

describe('validateDrawerParams', () => {
  it('a pour valeurs par défaut le meuble de référence', () => {
    expect(DEFAULT_DRAWER_PARAMS).toEqual(REFERENCE_DRAWERS)
  })

  it('accepte le meuble de référence', () => {
    expect(validateDrawerParams(REFERENCE_DRAWERS)).toEqual({ ok: true, value: REFERENCE_DRAWERS })
  })

  it.each(DRAWER_REFUSALS.map((item) => [item.label, item] as const))('refuse : %s', (_label, item) => {
    const error = refusal(item.params)
    expect(error.field).toBe(item.field)
    expect(error.message.toLowerCase()).toContain(item.contains.toLowerCase())
  })

  it.each([1, 10])('accepte %i tiroir(s) sur une hauteur suffisante', (drawerCount) => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, height: 20000, drawerCount }).ok).toBe(true)
  })

  it('accepte un jeu entre façades de 10 mm', () => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, frontGap: 100 }).ok).toBe(true)
  })

  it('accepte un jeu nul, tant que le tiroir du bas reste au-dessus du dessous', () => {
    // Fond du tiroir du bas à 0 + (2400 − 2000 − 50) / 2 = 17,5 mm : il touche un dessous de 18 mm, pas de 16 mm.
    expect(refusal({ ...REFERENCE_DRAWERS, frontGap: 0 }).field).toBe('boardThickness')
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, frontGap: 0, boardThickness: 160 }).ok).toBe(true)
  })

  it('accepte un meuble sans fond', () => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, backThickness: 0 }).ok).toBe(true)
  })

  it('accepte des jeux et épaisseurs non entiers en millimètres, mais pas en dixièmes', () => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, slideGap: 127 }).ok).toBe(true)
    expect(refusal({ ...REFERENCE_DRAWERS, slideGap: 12.5 }).field).toBe('slideGap')
  })
})

describe('maxDrawerCount', () => {
  it('donne 7 tiroirs au plus sur 720 mm de haut', () => {
    expect(maxDrawerCount(REFERENCE_DRAWERS)).toBe(7)
  })

  it('donne 0 si même un tiroir ne tient pas', () => {
    expect(maxDrawerCount({ ...REFERENCE_DRAWERS, height: 900 })).toBe(0)
  })
})

function ids(prefix = 'p'): () => string {
  let next = 0
  return () => `${prefix}${++next}`
}

function generate(params: DrawerParams = REFERENCE_DRAWERS, project: Project = createEmptyProject()): Project {
  const result = applyDrawerCabinet(project, params, ids())
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function byName(project: Project, name: string) {
  const piece = project.pieces.find((candidate) => candidate.name === name)
  if (!piece) throw new Error(`Pièce absente : ${name}`)
  return piece
}

describe('applyDrawerCabinet', () => {
  it('donne la liste de découpe calculée à la main', () => {
    const project = generate()
    expect(project.pieces).toHaveLength(REFERENCE_PIECE_COUNT)
    const lines = computeCutList(project).lines.map(({ quantity, length, width, thickness }) => ({ quantity, length, width, thickness }))
    expect(lines).toEqual(REFERENCE_DRAWER_LINES)
  })

  it('range la carcasse, puis chaque tiroir de haut en bas derrière sa façade', () => {
    const names = generate().pieces.map((piece) => piece.name)
    expect(names.slice(0, 5)).toEqual(['Côté gauche', 'Côté droit', 'Dessous', 'Dessus', 'Fond'])
    expect(names.slice(5, 11)).toEqual([
      'Façade 1',
      'Tiroir 1 côté gauche',
      'Tiroir 1 côté droit',
      'Tiroir 1 avant',
      'Tiroir 1 arrière',
      'Tiroir 1 fond'
    ])
    expect(names.filter((name) => name.startsWith('Façade'))).toEqual(['Façade 1', 'Façade 2', 'Façade 3'])
  })

  it('pose les façades en applique devant le caisson, la façade 1 en haut', () => {
    const project = generate()
    const p = REFERENCE_POSITIONS
    expect(byName(project, 'Façade 3').position).toEqual({ x: p.frontX, y: p.bottomFrontY, z: p.frontZ })
    expect(byName(project, 'Façade 1').position).toEqual({ x: p.frontX, y: p.topFrontY, z: p.frontZ })
    expect(byName(project, 'Façade 1').orientation).toEqual({ u: '+x', v: '+y' })
  })

  it('centre chaque tiroir sur sa façade, entre les côtés et entre le dessous et le dessus', () => {
    const project = generate()
    const p = REFERENCE_POSITIONS
    expect(byName(project, 'Tiroir 3 fond').position).toEqual({ x: p.drawerX, y: p.bottomDrawerBottomY, z: p.drawerZ })
    expect(pieceBounds(byName(project, 'Tiroir 1 côté gauche')).max.y).toBe(p.topDrawerTopY)
    for (const piece of project.pieces.filter((item) => item.name.startsWith('Tiroir'))) {
      const bounds = pieceBounds(piece)
      expect(bounds.min.z).toBeGreaterThanOrEqual(p.drawerZ)
      expect(bounds.max.z).toBeLessThanOrEqual(REFERENCE_DRAWERS.depth)
      expect(bounds.min.x).toBeGreaterThanOrEqual(p.drawerX)
      expect(bounds.max.x).toBeLessThanOrEqual(REFERENCE_DRAWERS.width - p.drawerX)
    }
  })

  it('ne fait se chevaucher aucune pièce, tiroirs fermés', () => {
    expect(findOverlaps(generate())).toEqual([])
    expect(findOverlaps(generate({ ...REFERENCE_DRAWERS, drawerCount: 7 }))).toEqual([])
    expect(findOverlaps(generate({ ...REFERENCE_DRAWERS, backThickness: 0, frontGap: 0, boardThickness: 160 }))).toEqual([])
  })

  it('donne le reste de la division à la façade du bas (721 mm)', () => {
    const layout = drawerLayout(TALL_DRAWERS)
    expect(layout.fronts.map((front) => front.height)).toEqual([
      TALL_FRONT_HEIGHTS.top,
      TALL_FRONT_HEIGHTS.middle,
      TALL_FRONT_HEIGHTS.bottom
    ])
    expect(layout.sideHeight).toBe(TALL_DRAWER_SIDE_HEIGHT)
    const project = generate(TALL_DRAWERS)
    expect(byName(project, 'Façade 3').shape).toEqual({ kind: 'rectangle', length: 5970, width: TALL_FRONT_HEIGHTS.bottom })
    expect(byName(project, 'Tiroir 3 côté gauche').shape.width).toBe(TALL_DRAWER_SIDE_HEIGHT)
    expect(findOverlaps(project)).toEqual([])
  })

  it('sans fond, la carcasse a 4 pièces sur toute la profondeur', () => {
    const project = generate({ ...REFERENCE_DRAWERS, backThickness: 0 })
    expect(project.pieces).toHaveLength(REFERENCE_PIECE_COUNT - 1)
    expect(project.pieces.some((piece) => piece.name === 'Fond')).toBe(false)
    expect(byName(project, 'Côté gauche').shape.width).toBe(5600)
  })

  it("laisse les matériaux vides et ne pose aucun chant sans l'option", () => {
    const project = generate()
    expect(project.pieces.every((piece) => piece.material === '' && piece.edges === undefined)).toBe(true)
  })

  it('retient le modèle, non retouché', () => {
    expect(generate().template).toEqual({ kind: 'drawers', params: REFERENCE_DRAWERS, customized: false })
  })

  it('refuse des réglages impossibles', () => {
    const result = applyDrawerCabinet(createEmptyProject(), { ...REFERENCE_DRAWERS, drawerCount: 10 }, ids())
    expect(result.ok).toBe(false)
  })
})

describe('applyDrawerCabinet : chants sur les bords avant (US4)', () => {
  it('chante le bord avant de la carcasse et les 4 bords des façades, rien sur les tiroirs ni le fond', () => {
    const project = generate({ ...REFERENCE_DRAWERS, frontEdges: true })
    const edges = Object.fromEntries(project.pieces.map((piece) => [piece.name, piece.edges]))
    for (const name of ['Côté gauche', 'Côté droit', 'Dessous', 'Dessus']) expect(edges[name]).toEqual(['top'])
    for (const k of [1, 2, 3]) expect(edges[`Façade ${k}`]).toEqual(['bottom', 'top', 'left', 'right'])
    expect(edges['Fond']).toBeUndefined()
    const drawerPieces = project.pieces.filter((piece) => piece.name.startsWith('Tiroir'))
    expect(drawerPieces).toHaveLength(15)
    expect(drawerPieces.every((piece) => piece.edges === undefined)).toBe(true)
    expect(project.template).toEqual({ kind: 'drawers', params: { ...REFERENCE_DRAWERS, frontEdges: true }, customized: false })
  })

  it("le bord haut chanté de la carcasse est bien à l'avant", () => {
    const project = generate({ ...REFERENCE_DRAWERS, frontEdges: true })
    for (const name of ['Côté gauche', 'Côté droit', 'Dessous', 'Dessus']) {
      const piece = byName(project, name)
      expect(piece.orientation.v).toBe('+z')
      expect(piece.position.z + piece.shape.width).toBe(REFERENCE_DRAWERS.depth)
    }
  })

  it("sans l'option, le meuble est le même qu'avec l'option absente", () => {
    expect(generate({ ...REFERENCE_DRAWERS, frontEdges: undefined })).toEqual(generate())
  })
})

describe('applyDrawerCabinet : ajuster après coup (US2)', () => {
  it('remplace toutes les pièces et remet le modèle à non retouché', () => {
    const first = generate()
    const touched = updatePiece(first, byName(first, 'Façade 1').id, { material: 'Chêne' })
    if (!touched.ok) throw new Error(touched.error.message)
    expect(touched.value.template?.customized).toBe(true)

    const result = applyDrawerCabinet(touched.value, { ...REFERENCE_DRAWERS, drawerCount: 4 }, ids('q'))
    if (!result.ok) throw new Error(result.error.message)
    expect(result.value.pieces).toHaveLength(REFERENCE_PIECE_COUNT + 6)
    expect(result.value.pieces.every((piece) => piece.id.startsWith('q') && piece.material === '')).toBe(true)
    expect(result.value.template).toEqual({ kind: 'drawers', params: { ...REFERENCE_DRAWERS, drawerCount: 4 }, customized: false })
    expect(result.value.name).toBe(touched.value.name)
    expect(result.value.layout).toBe(touched.value.layout)
  })
})
