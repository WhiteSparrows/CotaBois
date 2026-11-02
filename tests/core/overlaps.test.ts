import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { findOverlaps } from '../../src/core/geometry'
import { createEmptyProject, type Piece, type Project } from '../../src/core/model'
import { REFERENCE_CAISSONS } from '../fixtures/reference-furniture'

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
