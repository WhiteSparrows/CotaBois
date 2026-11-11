import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { defaultLayoutSettings, setLayoutOptions, setPanelStock, validateLayoutSettings } from '../../src/core/layout'
import { createEmptyProject, type LayoutSettings, type Project } from '../../src/core/model'
import { addPiece, newPanelInput } from '../../src/core/pieces'
import type { Result } from '../../src/core/result'

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function message<T>(result: Result<T>): string {
  if (result.ok) throw new Error('La modification aurait dû être refusée')
  return result.error.message
}

let counter = 0
function withPiece(project: Project, material: string, thickness = 180, length = 6000, width = 3000): Project {
  const input = { ...newPanelInput(project), material, thickness, shape: { kind: 'rectangle' as const, length, width } }
  return value(addPiece(project, input, `p${++counter}`))
}

describe('réglages par défaut', () => {
  it("un projet neuf a un trait de 3 mm, aucune marge et aucun panneau enregistré", () => {
    const expected: LayoutSettings = { kerf: 30, edgeMargin: 0, panels: [] }
    expect(defaultLayoutSettings()).toEqual(expected)
    expect(createEmptyProject().layout).toEqual(expected)
  })
})

describe('setLayoutOptions', () => {
  it.each([0, 30, 200])('accepte un trait de scie de %i dixièmes', (kerf) => {
    expect(value(setLayoutOptions(createEmptyProject(), { kerf })).layout.kerf).toBe(kerf)
  })

  it.each([-1, 201, 1.5])('refuse un trait de scie de %j, sans rien modifier', (kerf) => {
    const project = createEmptyProject()
    expect(message(setLayoutOptions(project, { kerf }))).toContain('20 mm')
    expect(project.layout.kerf).toBe(30)
  })

  it.each([0, 1000])('accepte une marge de %i dixièmes', (edgeMargin) => {
    expect(value(setLayoutOptions(createEmptyProject(), { edgeMargin })).layout.edgeMargin).toBe(edgeMargin)
  })

  it.each([-1, 1001, 2.5])('refuse une marge de %j', (edgeMargin) => {
    expect(message(setLayoutOptions(createEmptyProject(), { edgeMargin }))).toContain('100 mm')
  })

  it('refuse une marge qui ne laisse aucune surface utile, en nommant le panneau', () => {
    let project = withPiece(createEmptyProject(), 'Chêne')
    project = value(setPanelStock(project, 'Chêne', 180, { length: 25000, width: 1900 }))
    expect(message(setLayoutOptions(project, { edgeMargin: 950 }))).toContain('Chêne')
    expect(value(setLayoutOptions(project, { edgeMargin: 949 })).layout.edgeMargin).toBe(949)
  })

  it("vérifie aussi le panneau par défaut d'un groupe présent dans le meuble", () => {
    const project = withPiece(value(setLayoutOptions(createEmptyProject(), { edgeMargin: 1000 })), '')
    expect(value(setPanelStock(project, '', 180, { width: 2001 })).layout.panels).toHaveLength(1)
    expect(message(setPanelStock(project, '', 180, { width: 2000 }))).toContain('marge')
  })

  it("ne marque pas un caisson généré comme retouché", () => {
    const caisson = value(
      applyCaisson(createEmptyProject(), { width: 8000, height: 18000, depth: 4000, boardThickness: 180, backThickness: 50, shelfCount: 3 }, () => `c${++counter}`)
    )
    const changed = value(setLayoutOptions(caisson, { kerf: 40 }))
    expect(changed.template?.customized).toBe(false)
    expect(changed.pieces).toBe(caisson.pieces)
  })
})

describe('setPanelStock', () => {
  it('crée le panneau du groupe, avec les valeurs par défaut pour le reste', () => {
    const project = value(setPanelStock(createEmptyProject(), ' Chêne ', 180, { length: 25000 }))
    expect(project.layout.panels).toEqual([{ material: 'Chêne', thickness: 180, length: 25000, width: 20700, grain: false }])
  })

  it('reconnaît le matériau sans tenir compte des majuscules ni des espaces', () => {
    let project = value(setPanelStock(createEmptyProject(), 'Chêne', 180, { length: 25000 }))
    project = value(setPanelStock(project, ' chêne ', 180, { width: 12500, grain: true }))
    expect(project.layout.panels).toEqual([{ material: 'Chêne', thickness: 180, length: 25000, width: 12500, grain: true }])
  })

  it.each([
    ['longueur nulle', { length: 0 }, 'longueur'],
    ['longueur trop grande', { length: 100_001 }, 'longueur'],
    ['largeur décimale', { width: 12.5 }, 'largeur']
  ])('refuse une %s, sans rien modifier', (_label, changes, word) => {
    const project = createEmptyProject()
    expect(message(setPanelStock(project, 'Chêne', 180, changes)).toLowerCase()).toContain(word)
    expect(project.layout.panels).toEqual([])
  })

  it('range les panneaux par matériau, puis par épaisseur décroissante', () => {
    let project = createEmptyProject()
    for (const [material, thickness] of [['Pin', 180], ['', 50], ['Chêne', 50], ['Chêne', 180]] as const) {
      project = value(setPanelStock(project, material, thickness, { length: 25000 }))
    }
    expect(project.layout.panels.map((panel) => `${panel.material}|${panel.thickness}`)).toEqual(['|50', 'Chêne|180', 'Chêne|50', 'Pin|180'])
  })
})

describe('validateLayoutSettings', () => {
  const stock = { material: 'Chêne', thickness: 180, length: 25000, width: 12500, grain: false }

  it('accepte des réglages valides', () => {
    const settings = { kerf: 30, edgeMargin: 100, panels: [stock] }
    expect(value(validateLayoutSettings(settings))).toEqual(settings)
  })

  it.each<[string, LayoutSettings]>([
    ['trait de scie hors limites', { kerf: 201, edgeMargin: 0, panels: [] }],
    ['marge hors limites', { kerf: 30, edgeMargin: 1001, panels: [] }],
    ['épaisseur invalide', { kerf: 30, edgeMargin: 0, panels: [{ ...stock, thickness: 0 }] }],
    ['matériau trop long', { kerf: 30, edgeMargin: 0, panels: [{ ...stock, material: 'x'.repeat(81) }] }],
    ['couple en double', { kerf: 30, edgeMargin: 0, panels: [stock, { ...stock, material: ' chêne ' }] }],
    ['marge trop grande pour un panneau', { kerf: 30, edgeMargin: 1000, panels: [{ ...stock, width: 2000 }] }]
  ])('refuse : %s', (_label, settings) => {
    expect(validateLayoutSettings(settings).ok).toBe(false)
  })
})
