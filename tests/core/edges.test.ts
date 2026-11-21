import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { checkCutSizes, cutSize, edgeLength, edgeSummary } from '../../src/core/edges'
import { setLayoutOptions, setPanelStock } from '../../src/core/layout'
import { createEmptyProject, type EdgeName, type Piece, type Project } from '../../src/core/model'
import { addCopy, addPiece, duplicatePiece, newPanelInput, rotatePiece, setEdges, updatePiece } from '../../src/core/pieces'
import type { Result } from '../../src/core/result'
import { CUT_EXAMPLES, FRONT_EDGES, REFERENCE_PARAMS, SHELF } from '../fixtures/edge-references'

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function message<T>(result: Result<T>): string {
  if (result.ok) throw new Error('La modification aurait dû être refusée')
  return result.error.message
}

function piece(edges: EdgeName[] = [], length = SHELF.length, width = SHELF.width, name = 'Étagère'): Piece {
  return {
    id: name,
    name,
    shape: { kind: 'rectangle', length, width },
    thickness: 180,
    material: '',
    position: { x: 0, y: 0, z: 0 },
    orientation: { u: '+x', v: '+z' },
    ...(edges.length > 0 ? { edges } : {})
  }
}

function withPieces(...pieces: Piece[]): Project {
  let project = createEmptyProject()
  for (const item of pieces) {
    const { id, ...input } = item
    project = value(addPiece(project, input, id))
  }
  return project
}

function withEdgeThickness(project: Project, edgeThickness: number, material = ''): Project {
  return value(setPanelStock(project, material, 180, { edgeThickness }))
}

describe('cutSize', () => {
  it.each(CUT_EXAMPLES.map((example) => [example.edges.join(', ') || 'aucun chant', example] as const))(
    'chant de 2 mm, %s',
    (_label, example) => {
      expect(cutSize(piece(example.edges), SHELF.edgeThickness)).toEqual({ length: example.length, width: example.width })
    }
  )

  it('garde la cote finie avec un chant d\'épaisseur nulle', () => {
    expect(cutSize(piece(['bottom', 'top', 'left', 'right']), 0)).toEqual({ length: SHELF.length, width: SHELF.width })
  })
})

describe('edgeSummary', () => {
  it.each<[EdgeName[], number, number, string]>([
    [[], 7640, 3950, ''],
    [['top'], 7640, 3950, '1 long'],
    [['bottom', 'top'], 7640, 3950, '2 longs'],
    [['left'], 7640, 3950, '1 court'],
    [['left', 'right'], 7640, 3950, '2 courts'],
    [['bottom', 'top', 'left'], 7640, 3950, '2 longs, 1 court'],
    // Saisie plus large que longue : gauche et droit sont les bords longs
    [['left'], 3950, 7640, '1 long'],
    [['top'], 5000, 5000, '1 bord'],
    [['bottom', 'top', 'left', 'right'], 5000, 5000, '4 bords']
  ])('%j sur %i × %i : %j', (edges, length, width, text) => {
    expect(edgeSummary(edges, length, width)).toBe(text)
  })
})

describe('edgeLength', () => {
  it('additionne les côtés finis chantés et leurs surlongueurs', () => {
    expect(edgeLength(piece(), 200)).toBe(0)
    expect(edgeLength(piece(['top']), 0)).toBe(7640)
    expect(edgeLength(piece(['left', 'right']), 200)).toBe(2 * (3950 + 200))
  })

  it('donne 7,42 m et 7,56 m pour les bords avant du caisson de référence', () => {
    let id = 0
    let project = value(applyCaisson(createEmptyProject(), REFERENCE_PARAMS, () => `c${++id}`))
    const front = project.pieces.filter((item) => item.name !== 'Fond').map((item) => item.id)
    project = value(setEdges(project, front, 'top', true))
    const total = (overhang: number) => project.pieces.reduce((sum, item) => sum + edgeLength(item, overhang), 0)
    expect(total(0)).toBe(FRONT_EDGES.length)
    expect(total(FRONT_EDGES.overhang)).toBe(FRONT_EDGES.lengthWithOverhang)
  })
})

describe('setEdges', () => {
  it('pose un chant sur plusieurs pièces en une action, et marque le caisson comme retouché', () => {
    let id = 0
    const project = value(applyCaisson(createEmptyProject(), REFERENCE_PARAMS, () => `c${++id}`))
    const ids = project.pieces.slice(0, 3).map((item) => item.id)
    const changed = value(setEdges(project, ids, 'top', true))
    expect(changed.pieces.slice(0, 3).every((item) => item.edges?.includes('top'))).toBe(true)
    expect(changed.pieces.slice(3).every((item) => item.edges === undefined)).toBe(true)
    expect(changed.template?.customized).toBe(true)
  })

  it('range les bords dans un ordre fixe, et les retire tous sans laisser de liste vide', () => {
    let project = withPieces(piece())
    project = value(setEdges(project, ['Étagère'], 'left', true))
    project = value(setEdges(project, ['Étagère'], 'bottom', true))
    expect(project.pieces[0]?.edges).toEqual(['bottom', 'left'])
    project = value(setEdges(project, ['Étagère'], 'bottom', false))
    project = value(setEdges(project, ['Étagère'], 'left', false))
    expect(project.pieces[0]?.edges).toBeUndefined()
  })

  it('ne change rien si le chant est déjà là', () => {
    const project = withPieces(piece(['top']))
    expect(value(setEdges(project, ['Étagère'], 'top', true))).toBe(project)
  })

  it('refuse tout, en nommant la pièce, si une cote à couper deviendrait nulle', () => {
    // Taquet de 30 × 3 mm : un chant de 2 mm de chaque côté de la largeur ne laisse rien
    let project = withEdgeThickness(withPieces(piece(), piece(['bottom'], 300, 30, 'Taquet')), 20)
    project = value(setEdges(project, ['Étagère'], 'bottom', true))
    const error = message(setEdges(project, ['Étagère', 'Taquet'], 'top', true))
    expect(error).toContain('Taquet')
    expect(value(setEdges(project, ['Étagère'], 'top', true)).pieces[0]?.edges).toEqual(['bottom', 'top'])
  })

  it('refuse une pièce inconnue', () => {
    expect(setEdges(createEmptyProject(), ['absente'], 'top', true).ok).toBe(false)
  })
})

describe('les chants suivent la pièce (FR-005)', () => {
  const project = withPieces(piece(['bottom', 'left']))

  it('par rotation', () => {
    expect(value(rotatePiece(project, 'Étagère', 'y')).pieces[0]?.edges).toEqual(['bottom', 'left'])
  })

  it('par duplication et copier-coller', () => {
    expect(value(duplicatePiece(project, 'Étagère', 'copie')).pieces[1]?.edges).toEqual(['bottom', 'left'])
    expect(value(addCopy(project, project.pieces[0]!, 'collée')).pieces[1]?.edges).toEqual(['bottom', 'left'])
  })

  it('par changement de dimension', () => {
    expect(value(updatePiece(project, 'Étagère', { length: 9000 })).pieces[0]?.edges).toEqual(['bottom', 'left'])
  })
})

describe('cotes à couper toujours positives', () => {
  it('checkCutSizes nomme la pièce dont la cote à couper serait nulle', () => {
    const project = withPieces(piece(['bottom', 'top'], 300, 40, 'Taquet'))
    expect(checkCutSizes(project).ok).toBe(true)
    // Réglage écrit directement, sans passer par les contrôles de setPanelStock
    const stock = { material: '', thickness: 180, length: 28000, width: 20700, grain: false, edgeThickness: 20, panelPrice: null, edgePrice: null }
    const forced: Project = { ...project, layout: { ...project.layout, panels: [stock] } }
    expect(message(checkCutSizes(forced))).toContain('Taquet')
    expect(checkCutSizes(forced, ['autre']).ok).toBe(true)
  })

  it('refuse une épaisseur de chant qui ne laisse rien à couper, en nommant la pièce', () => {
    const project = withPieces(piece(['bottom', 'top'], 300, 40, 'Taquet'))
    expect(message(setPanelStock(project, '', 180, { edgeThickness: 20 }))).toContain('Taquet')
    expect(value(setPanelStock(project, '', 180, { edgeThickness: 19 })).layout.panels[0]?.edgeThickness).toBe(19)
  })

  it('refuse une épaisseur de chant au-delà de 10 mm', () => {
    expect(message(setPanelStock(createEmptyProject(), '', 180, { edgeThickness: 101 }))).toContain('10 mm')
  })

  it('refuse une dimension, un matériau ou une épaisseur qui ne laisse rien à couper', () => {
    let project = withEdgeThickness(withPieces(piece(['bottom', 'top'], 300, 50, 'Taquet')), 20)
    project = value(setPanelStock(project, 'Chêne', 180, { edgeThickness: 30 }))
    project = value(setPanelStock(project, '', 120, { edgeThickness: 30 }))
    expect(message(updatePiece(project, 'Taquet', { width: 40 }))).toContain('chant')
    expect(message(updatePiece(project, 'Taquet', { material: 'Chêne' }))).toContain('chant')
    expect(message(updatePiece(project, 'Taquet', { thickness: 120 }))).toContain('chant')
    expect(value(updatePiece(project, 'Taquet', { width: 41 })).pieces[0]?.shape.width).toBe(41)
  })

  it('une surlongueur se règle de 0 à 100 mm', () => {
    expect(value(setLayoutOptions(createEmptyProject(), { edgeOverhang: 0 })).layout.edgeOverhang).toBe(0)
    expect(value(setLayoutOptions(createEmptyProject(), { edgeOverhang: 1000 })).layout.edgeOverhang).toBe(1000)
    expect(message(setLayoutOptions(createEmptyProject(), { edgeOverhang: 1001 }))).toContain('100 mm')
  })
})

describe('newPanelInput', () => {
  it('crée un panneau sans chant', () => {
    expect(newPanelInput(createEmptyProject()).edges).toBeUndefined()
  })
})
