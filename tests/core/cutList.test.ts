import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { computeCutList } from '../../src/core/cutList'
import { createEmptyProject, type Piece, type Project } from '../../src/core/model'
import { REFERENCE_CAISSONS } from '../fixtures/reference-furniture'

let nextId = 0

function piece(length: number, width: number, thickness: number, changes: Partial<Piece> = {}): Piece {
  return {
    id: `p${++nextId}`,
    name: `Pièce ${nextId}`,
    shape: { kind: 'rectangle', length, width },
    thickness,
    material: '',
    position: { x: 0, y: 0, z: 0 },
    orientation: { u: '+x', v: '+y' },
    ...changes
  }
}

function project(...pieces: Piece[]): Project {
  return { ...createEmptyProject(), pieces }
}

describe('computeCutList : jeu de référence', () => {
  it.each(REFERENCE_CAISSONS.map((c) => [c.label, c] as const))('%s', (_label, reference) => {
    let id = 0
    const result = applyCaisson(createEmptyProject(), reference.params, () => `p${++id}`)
    if (!result.ok) throw new Error(result.error.message)

    const { lines } = computeCutList(result.value)
    expect(
      lines.map(({ quantity, names, length, width, thickness }) => ({ quantity, names, length, width, thickness }))
    ).toEqual(reference.lines)
  })

  it('table de V3 : un plateau et quatre pieds', () => {
    const { lines } = computeCutList(
      project(
        piece(12000, 7000, 300, { name: 'Plateau' }),
        ...[1, 2, 3, 4].map((n) => piece(7200, 600, 600, { name: `Pied ${n}` }))
      )
    )
    expect(lines.map(({ quantity, length, width, thickness }) => [quantity, length, width, thickness])).toEqual([
      [4, 7200, 600, 600],
      [1, 12000, 7000, 300]
    ])
  })
})

describe('computeCutList : regroupement', () => {
  it('regroupe des pièces identiques, quels que soient leur nom, leur position et leur orientation', () => {
    const { lines } = computeCutList(
      project(
        piece(1000, 500, 180, { name: 'A', position: { x: 0, y: 0, z: 0 }, orientation: { u: '+x', v: '+y' } }),
        piece(1000, 500, 180, { name: 'B', position: { x: 90, y: 90, z: 90 }, orientation: { u: '-z', v: '+x' } })
      )
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ quantity: 2, names: ['A', 'B'] })
  })

  it('considère 1000 × 500 et 500 × 1000 comme la même découpe, longueur en premier', () => {
    const { lines } = computeCutList(project(piece(1000, 500, 180), piece(500, 1000, 180)))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ quantity: 2, length: 1000, width: 500 })
  })

  it("affiche toujours la plus grande dimension en longueur", () => {
    const { lines } = computeCutList(project(piece(300, 900, 180)))
    expect(lines[0]).toMatchObject({ length: 900, width: 300 })
  })

  it('sépare les lignes si les dimensions diffèrent d\'un dixième', () => {
    expect(computeCutList(project(piece(1000, 500, 180), piece(1001, 500, 180))).lines).toHaveLength(2)
  })

  it("sépare les lignes si l'épaisseur diffère", () => {
    expect(computeCutList(project(piece(1000, 500, 180), piece(1000, 500, 190))).lines).toHaveLength(2)
  })

  it('sépare les lignes si le matériau diffère', () => {
    const { lines } = computeCutList(
      project(piece(1000, 500, 180, { material: 'Chêne' }), piece(1000, 500, 180, { material: 'Hêtre' }))
    )
    expect(lines).toHaveLength(2)
  })

  it('compare le matériau sans tenir compte de la casse ni des espaces, et garde sa première écriture', () => {
    const { lines } = computeCutList(
      project(piece(1000, 500, 180, { material: ' Chêne ' }), piece(1000, 500, 180, { material: 'chêne' }))
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]?.material).toBe('Chêne')
  })

  it('ne répète pas un nom présent sur plusieurs pièces', () => {
    const { lines } = computeCutList(
      project(piece(1000, 500, 180, { name: 'Tablette' }), piece(1000, 500, 180, { name: 'Tablette' }))
    )
    expect(lines[0]).toMatchObject({ quantity: 2, names: ['Tablette'] })
  })

  it('référence les pièces de chaque ligne', () => {
    const a = piece(1000, 500, 180)
    const b = piece(1000, 500, 180)
    const c = piece(200, 100, 180)
    const { lines } = computeCutList(project(a, c, b))
    expect(lines[0]?.pieceIds).toEqual([a.id, b.id])
    expect(lines[1]?.pieceIds).toEqual([c.id])
  })

  it('renvoie une liste vide sans pièce', () => {
    expect(computeCutList(createEmptyProject())).toEqual({ lines: [], totals: [] })
  })
})

describe('computeCutList : tri', () => {
  it('trie par matériau, puis épaisseur, longueur et largeur décroissantes', () => {
    const { lines } = computeCutList(
      project(
        piece(1000, 200, 180, { material: 'Hêtre' }),
        piece(500, 300, 50, { material: 'Chêne' }),
        piece(500, 400, 180, { material: 'Chêne' }),
        piece(900, 200, 180, { material: 'Chêne' }),
        piece(900, 300, 180, { material: 'Chêne' })
      )
    )
    expect(lines.map(({ material, thickness, length, width }) => [material, thickness, length, width])).toEqual([
      ['Chêne', 180, 900, 300],
      ['Chêne', 180, 900, 200],
      ['Chêne', 180, 500, 400],
      ['Chêne', 50, 500, 300],
      ['Hêtre', 180, 1000, 200]
    ])
  })

  it('donne le même résultat quel que soit l\'ordre de création', () => {
    const a = piece(1000, 500, 180, { name: 'A' })
    const b = piece(800, 500, 180, { name: 'B' })
    const toRows = (p: Project) => computeCutList(p).lines.map((line) => line.names)
    expect(toRows(project(a, b))).toEqual(toRows(project(b, a)))
  })
})

describe('computeCutList : totaux', () => {
  it('additionne pièces et surface par matériau et épaisseur', () => {
    const { totals } = computeCutList(
      project(
        piece(10000, 5000, 180, { material: 'Chêne' }),
        piece(10000, 5000, 180, { material: 'chêne' }),
        piece(2000, 1000, 180, { material: 'Chêne' }),
        piece(2000, 1000, 50, { material: 'Chêne' }),
        piece(2000, 1000, 180, { material: 'Hêtre' })
      )
    )
    expect(totals).toEqual([
      { material: 'Chêne', thickness: 180, pieceCount: 3, area: 102_000_000 },
      { material: 'Chêne', thickness: 50, pieceCount: 1, area: 2_000_000 },
      { material: 'Hêtre', thickness: 180, pieceCount: 1, area: 2_000_000 }
    ])
  })

  it('calcule le caisson de référence : 2,93 m² de côtés et de tablettes, 1,44 m² de fond', () => {
    const reference = REFERENCE_CAISSONS[0]!
    let id = 0
    const result = applyCaisson(createEmptyProject(), reference.params, () => `p${++id}`)
    if (!result.ok) throw new Error(result.error.message)
    expect(computeCutList(result.value).totals).toEqual([
      // 2 × 18000 × 3950 + 5 × 7640 × 3950 = 142 200 000 + 150 890 000
      { material: '', thickness: 180, pieceCount: 7, area: 293_090_000 },
      { material: '', thickness: 50, pieceCount: 1, area: 144_000_000 }
    ])
  })
})
