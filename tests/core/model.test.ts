import { describe, expect, it } from 'vitest'
import { createEmptyProject, validatePiece, validateProjectName, type Piece } from '../../src/core/model'

function piece(changes: Partial<Piece> = {}): Piece {
  return {
    id: 'p1',
    name: 'Côté',
    shape: { kind: 'rectangle', length: 18000, width: 3950 },
    thickness: 180,
    material: '',
    position: { x: 0, y: 0, z: 0 },
    orientation: { u: '+y', v: '+z' },
    ...changes
  }
}

function field(result: ReturnType<typeof validatePiece>): string | undefined {
  return result.ok ? undefined : result.error.field
}

describe('createEmptyProject', () => {
  it('crée un projet vide, sans modèle', () => {
    expect(createEmptyProject()).toEqual({
      name: 'Nouveau meuble',
      pieces: [],
      template: null,
      layout: { kerf: 30, edgeMargin: 0, panels: [] }
    })
  })
})

describe('validatePiece', () => {
  it('accepte une pièce valide', () => {
    expect(validatePiece(piece()).ok).toBe(true)
  })

  it('accepte les bornes de nom, de cotes et de position', () => {
    expect(
      validatePiece(
        piece({
          name: 'a'.repeat(80),
          material: 'b'.repeat(80),
          shape: { kind: 'rectangle', length: 1, width: 100_000 },
          thickness: 100_000,
          position: { x: -1_000_000, y: 1_000_000, z: 0 }
        })
      ).ok
    ).toBe(true)
  })

  it.each([
    ['', 'name'],
    ['   ', 'name'],
    ['a'.repeat(81), 'name']
  ])('refuse le nom %j', (name, expected) => {
    expect(field(validatePiece(piece({ name })))).toBe(expected)
  })

  it('compte le nom après suppression des espaces', () => {
    expect(validatePiece(piece({ name: `  ${'a'.repeat(80)}  ` })).ok).toBe(true)
  })

  it('refuse un matériau de plus de 80 caractères', () => {
    expect(field(validatePiece(piece({ material: 'a'.repeat(81) })))).toBe('material')
  })

  it.each([0, -1, 100_001, 1.5, Number.NaN])('refuse la longueur %d', (length) => {
    expect(field(validatePiece(piece({ shape: { kind: 'rectangle', length, width: 100 } })))).toBe('length')
  })

  it.each([0, 100_001, 0.5])('refuse la largeur %d', (width) => {
    expect(field(validatePiece(piece({ shape: { kind: 'rectangle', length: 100, width } })))).toBe('width')
  })

  it.each([0, 100_001, 2.5])("refuse l'épaisseur %d", (thickness) => {
    expect(field(validatePiece(piece({ thickness })))).toBe('thickness')
  })

  it.each([-1_000_001, 1_000_001, 0.5])('refuse la position %d', (x) => {
    expect(field(validatePiece(piece({ position: { x, y: 0, z: 0 } })))).toBe('position')
  })

  it.each([
    ['+x', '+x'],
    ['+x', '-x'],
    ['-z', '+z']
  ] as const)('refuse les axes non perpendiculaires %s et %s', (u, v) => {
    expect(field(validatePiece(piece({ orientation: { u, v } })))).toBe('orientation')
  })

  it('explique le refus en français, en millimètres', () => {
    const result = validatePiece(piece({ thickness: 0 }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('0,1')
  })
})

describe('validateProjectName', () => {
  it('accepte un nom de 1 à 120 caractères après suppression des espaces', () => {
    expect(validateProjectName('a').ok).toBe(true)
    expect(validateProjectName(`  ${'a'.repeat(120)} `).ok).toBe(true)
  })

  it.each(['', '  ', 'a'.repeat(121)])('refuse %j', (name) => {
    expect(validateProjectName(name).ok).toBe(false)
  })
})
