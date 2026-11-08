import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { findOverlaps } from '../../src/core/geometry'
import { createEmptyProject, type Piece, type Project } from '../../src/core/model'
import { REFERENCE_CAISSONS } from '../fixtures/reference-furniture'
import { box as cutoutBox, circle, round, shaped } from '../fixtures/shape-references'

function box(id: string, x: number, y = 0, z = 0): Piece {
  return {
    id,
    name: id,
    shape: { kind: 'rectangle', length: 1000, width: 1000 },
    thickness: 1000,
    material: '',
    position: { x, y, z },
    orientation: { u: '+x', v: '+z' }
  }
}

function project(...pieces: Piece[]): Project {
  return { ...createEmptyProject(), pieces }
}

describe('findOverlaps : pièces de forme', () => {
  // Tablette à plat, de x 0 à 1000 mm, z 0 à 500 mm, y 0 à 18 mm
  const tablet = (shape: Piece['shape'], orientation: Piece['orientation'] = { u: '+x', v: '+z' }): Piece => ({
    id: 'tablette',
    name: 'Tablette',
    shape,
    thickness: 180,
    material: '',
    position: { x: 0, y: 0, z: 0 },
    orientation
  })

  /** Un montant vertical de section `dx` × `dz`, traversant la tablette. */
  const post = (x: number, z: number, dx: number, dz: number): Piece => ({
    id: 'montant',
    name: 'Montant',
    shape: { kind: 'rectangle', length: 20000, width: dx },
    thickness: dz,
    material: '',
    position: { x, y: -10000, z },
    orientation: { u: '+y', v: '+x' }
  })

  const notched = shaped(10000, 5000, {}, [cutoutBox('e', 500, 300, ['left', 0], ['bottom', 0])])
  const holed = shaped(10000, 5000, {}, [circle('t', 600, ['left', 1500], ['bottom', 1500])])

  it('ne signale pas un montant logé exactement dans une encoche', () => {
    expect(findOverlaps(project(tablet(notched), post(0, 0, 500, 300)))).toEqual([])
  })

  it('signale un montant qui dépasse de l\'encoche d\'un dixième', () => {
    expect(findOverlaps(project(tablet(notched), post(0, 0, 501, 300)))).toEqual([['tablette', 'montant']])
  })

  it('ne signale pas un montant qui passe dans un trou rond', () => {
    expect(findOverlaps(project(tablet(holed), post(1400, 1400, 200, 200)))).toEqual([])
  })

  it('signale un montant plus large que le trou', () => {
    expect(findOverlaps(project(tablet(holed), post(1250, 1250, 500, 500)))).toEqual([['tablette', 'montant']])
  })

  it('tient compte d\'une orientation négative', () => {
    const mirrored = tablet(notched, { u: '-x', v: '+z' })
    expect(findOverlaps(project(mirrored, post(9500, 0, 500, 300)))).toEqual([])
    expect(findOverlaps(project(mirrored, post(0, 0, 500, 300)))).toEqual([['tablette', 'montant']])
  })

  it('compare deux pièces parallèles dans leur plan', () => {
    const inHole: Piece = {
      id: 'pastille',
      name: 'Pastille',
      shape: { kind: 'rectangle', length: 200, width: 200 },
      thickness: 180,
      material: '',
      position: { x: 1400, y: 0, z: 1400 },
      orientation: { u: '+x', v: '+z' }
    }
    expect(findOverlaps(project(tablet(holed), inHole))).toEqual([])
    expect(findOverlaps(project(tablet(holed), { ...inHole, position: { x: 500, y: 0, z: 500 } }))).toEqual([['tablette', 'pastille']])
  })

  it('tient compte d\'un coin retiré', () => {
    const rounded = shaped(10000, 5000, { bottomLeft: round(1000) })
    expect(findOverlaps(project(tablet(rounded), post(0, 0, 100, 100)))).toEqual([])
    expect(findOverlaps(project(tablet(rounded), post(800, 800, 100, 100)))).toEqual([['tablette', 'montant']])
  })

  it('compare deux pièces de forme entre elles', () => {
    const second: Piece = {
      id: 'autre',
      name: 'Autre',
      shape: shaped(10000, 5000, {}, [cutoutBox('e', 500, 300, ['left', 0], ['bottom', 0])]),
      thickness: 180,
      material: '',
      position: { x: 0, y: 0, z: 0 },
      orientation: { u: '+x', v: '+z' }
    }
    expect(findOverlaps(project(tablet(notched), second))).toEqual([['tablette', 'autre']])
  })
})

describe('findOverlaps', () => {
  it('signale deux volumes qui s\'interpénètrent', () => {
    expect(findOverlaps(project(box('a', 0), box('b', 500)))).toEqual([['a', 'b']])
  })

  it("signale une pièce entièrement contenue dans une autre", () => {
    const small: Piece = { ...box('b', 100, 100, 100), shape: { kind: 'rectangle', length: 10, width: 10 }, thickness: 10 }
    expect(findOverlaps(project(box('a', 0), small))).toEqual([['a', 'b']])
  })

  it('signale un écart d\'un seul dixième de chevauchement', () => {
    expect(findOverlaps(project(box('a', 0), box('b', 999)))).toEqual([['a', 'b']])
  })

  it('ne signale pas le contact bord à bord', () => {
    expect(findOverlaps(project(box('a', 0), box('b', 1000)))).toEqual([])
  })

  it('ne signale pas deux pièces éloignées sur un seul axe', () => {
    expect(findOverlaps(project(box('a', 0), box('b', 0, 2000)))).toEqual([])
  })

  it('liste toutes les paires', () => {
    expect(findOverlaps(project(box('a', 0), box('b', 500), box('c', 700)))).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c']
    ])
  })

  it.each(REFERENCE_CAISSONS.map((c) => [c.label, c] as const))('ne signale rien sur un caisson généré : %s', (_label, reference) => {
    let id = 0
    const result = applyCaisson(createEmptyProject(), reference.params, () => `p${++id}`)
    if (!result.ok) throw new Error(result.error.message)
    expect(findOverlaps(result.value)).toEqual([])
  })
})
