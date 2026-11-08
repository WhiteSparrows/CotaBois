import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { computeCutList } from '../../src/core/cutList'
import { boundsOverlap, findOverlaps, pieceBounds, pieceSize } from '../../src/core/geometry'
import { createEmptyProject, type Piece, type Project, type ShapedShape } from '../../src/core/model'
import { resolveCutout } from '../../src/core/shape'
import { box, round, shaped, TABLET } from '../fixtures/shape-references'
import {
  addCopy,
  addPiece,
  duplicatePiece,
  newPanelInput,
  removePieces,
  renameProject,
  rotatePiece,
  updatePiece
} from '../../src/core/pieces'
import type { Result } from '../../src/core/result'

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function panel(id: string, changes: Partial<Piece> = {}): Piece {
  return {
    id,
    name: `Pièce ${id}`,
    shape: { kind: 'rectangle', length: 10000, width: 5000 },
    thickness: 180,
    material: '',
    position: { x: 0, y: 0, z: 0 },
    orientation: { u: '+x', v: '+z' },
    ...changes
  }
}

function project(...pieces: Piece[]): Project {
  return { ...createEmptyProject(), pieces }
}

function caisson(): Project {
  let id = 0
  return value(
    applyCaisson(
      createEmptyProject(),
      { width: 8000, height: 18000, depth: 4000, boardThickness: 180, backThickness: 50, shelfCount: 3 },
      () => `c${++id}`
    )
  )
}

describe('newPanelInput et addPiece', () => {
  it("place le premier panneau à l'origine, à plat", () => {
    const input = newPanelInput(createEmptyProject())
    expect(input.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(input.orientation).toEqual({ u: '+x', v: '+z' })
    expect(input.name).toBe('Panneau 1')
  })

  it('place les panneaux suivants au contact du meuble, sans chevauchement', () => {
    const start = caisson()
    const next = value(addPiece(start, newPanelInput(start), 'n1'))
    expect(findOverlaps(next)).toEqual([])
    expect(next.pieces.at(-1)?.position.x).toBe(8000)
  })

  it('choisit un nom libre', () => {
    const start = project(panel('a', { name: 'Panneau 1' }), panel('b', { name: 'Panneau 3' }))
    expect(newPanelInput(start).name).toBe('Panneau 2')
  })

  it('ajoute la pièce et marque le caisson comme retouché', () => {
    const start = caisson()
    const next = value(addPiece(start, newPanelInput(start), 'n1'))
    expect(next.pieces).toHaveLength(start.pieces.length + 1)
    expect(next.template?.customized).toBe(true)
    expect(start.template?.customized).toBe(false)
  })

  it('reste sans modèle dans un projet parti de zéro', () => {
    const next = value(addPiece(createEmptyProject(), newPanelInput(createEmptyProject()), 'n1'))
    expect(next.template).toBeNull()
  })

  it('refuse une pièce invalide', () => {
    const input = { ...newPanelInput(createEmptyProject()), thickness: 0 }
    expect(addPiece(createEmptyProject(), input, 'n1').ok).toBe(false)
  })
})

describe('duplicatePiece', () => {
  it("copie les cotes et le matériau, sous un nom distinct", () => {
    const start = project(panel('a', { name: 'Plateau', material: 'Chêne' }))
    const copy = value(duplicatePiece(start, 'a', 'b')).pieces[1]
    expect(copy).toMatchObject({ id: 'b', name: 'Plateau (copie)', material: 'Chêne', thickness: 180, shape: start.pieces[0]?.shape })
  })

  it('place la copie au contact de l\'original, sans le chevaucher', () => {
    const next = value(duplicatePiece(project(panel('a')), 'a', 'b'))
    const [a, b] = next.pieces.map(pieceBounds)
    expect(boundsOverlap(a!, b!)).toBe(false)
    expect(b!.min.x).toBe(a!.max.x)
  })

  it('trouve une place libre même si les abords sont occupés', () => {
    const start = caisson()
    const shelf = start.pieces.find((piece) => piece.name === 'Étagère 2')!
    const next = value(duplicatePiece(start, shelf.id, 'copy'))
    expect(findOverlaps(next)).toEqual([])
  })

  it('garde un nom valide quand le nom est déjà long', () => {
    const start = project(panel('a', { name: 'n'.repeat(80) }))
    const copy = value(duplicatePiece(start, 'a', 'b')).pieces[1]
    expect(copy?.name.length).toBeLessThanOrEqual(80)
    expect(copy?.name.endsWith('(copie)')).toBe(true)
  })

  it('refuse une pièce inconnue', () => {
    expect(duplicatePiece(project(panel('a')), 'zzz', 'b').ok).toBe(false)
  })
})

describe('pièces de forme : conservation de la forme', () => {
  const shapedPanel = (id: string, shape: ShapedShape = TABLET) => panel(id, { shape, name: 'Tablette' })

  it('suit une rotation, sans changer ses cotes', () => {
    const next = value(rotatePiece(project(shapedPanel('a')), 'a', 'y'))
    expect(next.pieces[0]?.shape).toEqual(TABLET)
  })

  it('suit une duplication et un copier-coller', () => {
    const original = shapedPanel('a')
    expect(value(duplicatePiece(project(original), 'a', 'b')).pieces[1]?.shape).toEqual(TABLET)
    expect(value(addCopy(createEmptyProject(), original, 'c')).pieces[0]?.shape).toEqual(TABLET)
  })

  it('change de longueur en gardant la distance au bord de référence', () => {
    const shape = shaped(8000, 3000, {}, [box('fixe', 500, 300, ['left', 1000], ['bottom', 500]), box('suit', 500, 300, ['right', 1000], ['bottom', 500])])
    const next = value(updatePiece(project(shapedPanel('a', shape)), 'a', { length: 9000 })).pieces[0]!.shape
    expect(next).toMatchObject({ length: 9000 })
    expect(resolveCutout(next as ShapedShape, shape.cutouts[0]!)).toMatchObject({ minU: 1000, maxU: 1500 })
    expect(resolveCutout(next as ShapedShape, shape.cutouts[1]!)).toMatchObject({ minU: 7500, maxU: 8000 })
  })

  it('refuse une dimension qui ne laisse plus tenir la forme, sans modifier le projet', () => {
    const start = project(shapedPanel('a'))
    const result = updatePiece(start, 'a', { length: 1500 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe('shape')
    expect(start.pieces[0]?.shape).toEqual(TABLET)
  })

  it('refuse une pièce dont la forme est invalide', () => {
    expect(addPiece(createEmptyProject(), { ...newPanelInput(createEmptyProject()), shape: shaped(8000, 3000, { topLeft: round(0) }) }, 'a').ok).toBe(false)
  })
})

describe('addCopy', () => {
  it('colle une pièce qui a depuis disparu du projet', () => {
    const original = panel('a', { name: 'Plateau', material: 'Chêne' })
    const start = removePieces(project(original, panel('b', { position: { x: 90000, y: 0, z: 0 } })), ['a'])
    const copy = value(addCopy(start, original, 'c')).pieces.at(-1)
    expect(copy).toMatchObject({ id: 'c', name: 'Plateau (copie)', material: 'Chêne', shape: original.shape, thickness: 180 })
  })

  it('colle dans un autre projet, à la place d\'origine si elle est libre', () => {
    const original = panel('a', { position: { x: 500, y: 600, z: 700 } })
    const copy = value(addCopy(createEmptyProject(), original, 'c')).pieces[0]
    expect(copy?.position).toEqual({ x: 500, y: 600, z: 700 })
  })

  it('ne chevauche rien, même collée plusieurs fois de suite', () => {
    const original = panel('a')
    let current = project(original)
    for (let i = 1; i <= 8; i++) current = value(addCopy(current, original, `c${i}`))
    expect(current.pieces).toHaveLength(9)
    expect(findOverlaps(current)).toEqual([])
  })

  it('garde les cotes de découpe', () => {
    const original = panel('a')
    const lines = computeCutList(value(addCopy(project(original), original, 'c'))).lines
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ quantity: 2, length: 10000, width: 5000, thickness: 180 })
  })

  it('marque le caisson comme retouché', () => {
    const start = caisson()
    expect(value(addCopy(start, start.pieces[0]!, 'c')).template?.customized).toBe(true)
  })
})

describe('removePieces', () => {
  it('retire les pièces demandées et marque le caisson comme retouché', () => {
    const start = caisson()
    const ids = start.pieces.slice(0, 2).map((piece) => piece.id)
    const next = removePieces(start, ids)
    expect(next.pieces).toHaveLength(start.pieces.length - 2)
    expect(next.template?.customized).toBe(true)
  })

  it('renvoie le même projet si rien ne change', () => {
    const start = caisson()
    expect(removePieces(start, ['zzz'])).toBe(start)
  })

  it('accepte de retirer la dernière pièce', () => {
    expect(removePieces(project(panel('a')), ['a']).pieces).toEqual([])
  })
})

describe('updatePiece', () => {
  it('change les cotes, et la liste de découpe suit', () => {
    const next = value(updatePiece(project(panel('a')), 'a', { length: 12000, width: 7000, thickness: 300 }))
    expect(computeCutList(next).lines[0]).toMatchObject({ length: 12000, width: 7000, thickness: 300 })
  })

  it('change le nom, le matériau et la position, sans espaces superflus', () => {
    const next = value(updatePiece(project(panel('a')), 'a', { name: ' Plateau ', material: ' Chêne ', position: { x: 10, y: 20, z: 30 } }))
    expect(next.pieces[0]).toMatchObject({ name: 'Plateau', material: 'Chêne', position: { x: 10, y: 20, z: 30 } })
  })

  it('marque le caisson comme retouché', () => {
    const start = caisson()
    const next = value(updatePiece(start, start.pieces[0]!.id, { material: 'Chêne' }))
    expect(next.template?.customized).toBe(true)
  })

  it('renvoie le même projet si rien ne change', () => {
    const start = caisson()
    const piece = start.pieces[0]!
    const result = value(updatePiece(start, piece.id, { name: piece.name, length: piece.shape.length }))
    expect(result).toBe(start)
  })

  it.each([
    [{ length: 0 }, 'length'],
    [{ width: 100_001 }, 'width'],
    [{ thickness: -1 }, 'thickness'],
    [{ name: '  ' }, 'name'],
    [{ material: 'a'.repeat(81) }, 'material'],
    [{ position: { x: 2_000_000, y: 0, z: 0 } }, 'position']
  ])('refuse %j, sans modifier le projet', (changes, field) => {
    const start = project(panel('a'))
    const result = updatePiece(start, 'a', changes)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe(field)
    expect(start.pieces[0]).toEqual(panel('a'))
  })

  it('refuse une pièce inconnue', () => {
    expect(updatePiece(project(panel('a')), 'zzz', { name: 'x' }).ok).toBe(false)
  })
})

describe('rotatePiece', () => {
  it('fait passer la longueur sur un autre axe, sans changer les cotes de découpe', () => {
    const start = project(panel('a'))
    const before = computeCutList(start).lines
    const next = value(rotatePiece(start, 'a', 'z'))
    expect(pieceSize(start.pieces[0]!)).toEqual({ x: 10000, y: 180, z: 5000 })
    expect(pieceSize(next.pieces[0]!)).toEqual({ x: 180, y: 10000, z: 5000 })
    expect(computeCutList(next).lines).toEqual(before)
  })

  it.each(['x', 'y', 'z'] as const)('garde le centre de la pièce autour de %s, au dixième près', (axis) => {
    const start = project(panel('a', { position: { x: 1000, y: 2000, z: 3000 } }))
    const before = pieceBounds(start.pieces[0]!)
    const after = pieceBounds(value(rotatePiece(start, 'a', axis)).pieces[0]!)
    for (const a of ['x', 'y', 'z'] as const) {
      expect(Math.abs(after.min[a] + after.max[a] - (before.min[a] + before.max[a]))).toBeLessThanOrEqual(1)
    }
  })

  it.each(['x', 'y', 'z'] as const)('revient exactement au départ après 4 quarts de tour autour de %s', (axis) => {
    // Des cotes impaires font tomber le centre sur un demi-dixième : aucune dérive ne doit s'accumuler.
    const start = project(panel('a', { shape: { kind: 'rectangle', length: 1001, width: 502 }, thickness: 185, position: { x: 7, y: -3, z: 11 } }))
    let current = start
    for (let i = 0; i < 4; i++) current = value(rotatePiece(current, 'a', axis))
    expect(current.pieces[0]).toEqual(start.pieces[0])
  })

  it('marque le caisson comme retouché', () => {
    const start = caisson()
    expect(value(rotatePiece(start, start.pieces[0]!.id, 'x')).template?.customized).toBe(true)
  })

  it('refuse une pièce inconnue', () => {
    expect(rotatePiece(project(panel('a')), 'zzz', 'x').ok).toBe(false)
  })
})

describe('renameProject', () => {
  it('change le nom sans marquer le caisson comme retouché', () => {
    const next = value(renameProject(caisson(), ' Bibliothèque '))
    expect(next.name).toBe('Bibliothèque')
    expect(next.template?.customized).toBe(false)
  })

  it('refuse un nom vide', () => {
    expect(renameProject(caisson(), ' ').ok).toBe(false)
  })
})
