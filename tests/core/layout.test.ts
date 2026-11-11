import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { computeCutList } from '../../src/core/cutList'
import {
  computeLayout,
  defaultLayoutSettings,
  formatUsage,
  setLayoutOptions,
  setPanelStock,
  validateLayoutSettings,
  type Layout
} from '../../src/core/layout'
import { createEmptyProject, type LayoutSettings, type Project } from '../../src/core/model'
import { addPiece, newPanelInput } from '../../src/core/pieces'
import type { Result } from '../../src/core/result'
import { HAND_CASES } from '../fixtures/layout-references'
import { TABLET } from '../fixtures/shape-references'
import { checkPanel, checkSize } from './layoutChecker'

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

/** Un meuble de pièces rectangulaires : `[nom, matériau, épaisseur, longueur, largeur]`. */
function furniture(specs: ReadonlyArray<readonly [string, string, number, number, number]>, start = createEmptyProject()): Project {
  let project = start
  for (const [name, material, thickness, length, width] of specs) {
    const input = { ...newPanelInput(project), name, material, thickness, shape: { kind: 'rectangle' as const, length, width } }
    project = value(addPiece(project, input, `p${++counter}`))
  }
  return project
}

function quarter(names: readonly string[]) {
  return names.map((name) => [name, 'Chêne', 180, 10000, 5000] as const)
}

/** Tous les panneaux de tous les groupes passent le vérificateur, et chaque pièce est placée une fois ou signalée. */
function verifyLayout(project: Project, layout: Layout): string | null {
  const seen = new Map<string, number>()
  for (const group of layout.groups) {
    const { length, width } = group.stock
    const margin = project.layout.edgeMargin
    const frame = { sizeX: length, sizeY: width, usable: { x: margin, y: margin, sizeX: length - 2 * margin, sizeY: width - 2 * margin }, kerf: project.layout.kerf }
    for (const panel of group.panels) {
      const error = checkPanel(frame, panel)
      if (error) return `${group.material} ${group.thickness} : ${error}`
      if (panel.cuts.some((cut, index) => cut.order !== index + 1)) return 'coupes mal numérotées'
      for (const placement of panel.placements) {
        if (placement.pieceIds.length !== panel.quantity) return 'identifiants incomplets'
        for (const id of placement.pieceIds) {
          const piece = project.pieces.find((candidate) => candidate.id === id)!
          const sizeError = checkSize(placement, { sizeX: piece.shape.length, sizeY: piece.shape.width }, !group.stock.grain)
          if (sizeError) return `${piece.name} : ${sizeError}`
          seen.set(id, (seen.get(id) ?? 0) + 1)
        }
      }
    }
    for (const missing of group.unplaced) seen.set(missing.pieceId, (seen.get(missing.pieceId) ?? 0) + 1)
  }
  const wrong = project.pieces.filter((piece) => seen.get(piece.id) !== 1)
  return wrong.length === 0 ? null : `pièces perdues ou en double : ${wrong.map((piece) => piece.name).join(', ')}`
}

describe('computeLayout : nombre de panneaux (US1)', () => {
  it('sans pièce, ne donne aucun groupe', () => {
    expect(computeLayout(createEmptyProject())).toEqual({ groups: [], complete: true })
  })

  it('place 4 pièces de 1000 × 500 sur un panneau de 2000 × 1000 sans trait de scie, à 100 %', () => {
    let project = furniture(quarter(['A', 'B', 'C', 'D']))
    project = value(setPanelStock(project, 'Chêne', 180, { length: 20000, width: 10000 }))
    project = value(setLayoutOptions(project, { kerf: 0 }))
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    const [group] = layout.groups
    expect(group).toMatchObject({ material: 'Chêne', thickness: 180, panelCount: 1, pieceCount: 4, placedCount: 4, unplaced: [] })
    expect(formatUsage(group!.usedArea, group!.panelArea)).toBe('100 %')
    expect(layout.complete).toBe(true)
  })

  it('en demande 2 avec un trait de 3 mm', () => {
    let project = furniture(quarter(['A', 'B', 'C', 'D']))
    project = value(setPanelStock(project, 'Chêne', 180, { length: 20000, width: 10000 }))
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    expect(layout.groups[0]?.panelCount).toBe(2)
    expect(layout.groups[0]?.panelArea).toBe(2 * 20000 * 10000)
  })

  it('fait un groupe par matériau et épaisseur, dans l\'ordre des totaux de la liste de découpe', () => {
    const project = furniture([
      ['Côté', 'chêne ', 180, 18000, 3950],
      ['Fond', '', 50, 18000, 8000],
      ['Étagère', 'Chêne', 180, 7640, 3950],
      ['Plinthe', 'Pin', 180, 7640, 1000]
    ])
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    const totals = computeCutList(project).totals
    expect(layout.groups.map((group) => [group.material, group.thickness, group.pieceCount])).toEqual(
      totals.map((total) => [total.material, total.thickness, total.pieceCount])
    )
  })

  it('utilise le panneau par défaut d\'un groupe sans réglage', () => {
    const [group] = computeLayout(furniture([['Côté', '', 180, 18000, 3950]])).groups
    expect(group?.stock).toMatchObject({ length: 28000, width: 20700, grain: false, isDefault: true })
  })

  it('nomme une pièce trop grande, place les autres, et indique un résultat incomplet', () => {
    const project = furniture([
      ['Plateau', '', 180, 30000, 5000],
      ['Côté', '', 180, 18000, 3950]
    ])
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    expect(layout.complete).toBe(false)
    expect(layout.groups[0]).toMatchObject({ pieceCount: 2, placedCount: 1, panelCount: 1 })
    expect(layout.groups[0]?.unplaced).toEqual([
      { pieceId: project.pieces[0]!.id, name: 'Plateau', length: 30000, width: 5000, reason: 'too-large' }
    ])
  })

  it('retire la marge de bord de la surface utile', () => {
    let project = furniture([['Plateau', '', 180, 19800, 9800]])
    project = value(setPanelStock(project, '', 180, { length: 20000, width: 10000 }))
    project = value(setLayoutOptions(project, { edgeMargin: 100 }))
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    expect(layout.groups[0]?.panels[0]?.placements[0]).toMatchObject({ x: 100, y: 100, sizeX: 19800, sizeY: 9800 })
  })

  it('ne modifie pas le projet', () => {
    const project = furniture(quarter(['A', 'B', 'C']))
    const copy = structuredClone(project)
    computeLayout(project)
    expect(project).toEqual(copy)
  })

  it('respecte tous les invariants sur un caisson complet', () => {
    const project = value(
      applyCaisson(createEmptyProject(), { width: 8000, height: 18000, depth: 4000, boardThickness: 180, backThickness: 50, shelfCount: 3 }, () => `c${++counter}`)
    )
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    expect(layout.groups.map((group) => group.panelCount)).toEqual([1, 1])
  })
})

describe('formatUsage', () => {
  it.each([
    [1000, 1000, '100 %'],
    [873, 1000, '87,3 %'],
    [999_999, 1_000_000, '99,9 %'],
    [0, 1000, '0 %'],
    [0, 0, '0 %']
  ])('%i sur %i donne %s, arrondi à la décimale inférieure', (used, total, text) => {
    expect(formatUsage(used, total)).toBe(text)
  })
})

describe('computeLayout : placement visible (US2)', () => {
  it('donne à chaque pièce placée son nom, son identifiant et son numéro de plan de forme', () => {
    let project = furniture([['Côté', '', 180, 18000, 3950]])
    project = value(addPiece(project, { ...newPanelInput(project), name: 'Tablette', shape: TABLET }, 'tablette'))
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    const placements = layout.groups[0]!.panels.flatMap((panel) => panel.placements)
    const tablet = placements.find((placement) => placement.names.includes('Tablette'))
    expect(tablet).toMatchObject({ pieceIds: ['tablette'], plan: 1 })
    expect(tablet!.sizeX * tablet!.sizeY).toBe(TABLET.length * TABLET.width)
    expect(placements.find((placement) => placement.names.includes('Côté'))?.plan).toBeNull()
  })

  it('regroupe les panneaux identiques avec leur quantité, même si les noms diffèrent', () => {
    let project = furniture(['A', 'B', 'C', 'D'].map((name) => [name, '', 180, 20000, 10000] as const))
    project = value(setPanelStock(project, '', 180, { length: 20000, width: 10000 }))
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    const [group] = layout.groups
    expect(group?.panelCount).toBe(4)
    expect(group?.panels).toHaveLength(1)
    expect(group?.panels[0]).toMatchObject({ quantity: 4, cuts: [], offcuts: [] })
    expect(group?.panels[0]?.placements[0]?.names).toEqual(['A', 'B', 'C', 'D'])
  })

  it('tourne une pièce qui ne rentre que tournée, et le signale', () => {
    let project = furniture([['Montant', '', 180, 5000, 15000]])
    project = value(setPanelStock(project, '', 180, { length: 20000, width: 10000 }))
    const placement = computeLayout(project).groups[0]?.panels[0]?.placements[0]
    expect(placement).toMatchObject({ sizeX: 15000, sizeY: 5000, rotated: true })
  })
})

describe('computeLayout : ordre des coupes (US4)', () => {
  it('numérote les coupes à partir de 1, sans délignage sans marge', () => {
    const project = furniture(quarter(['A', 'B', 'C']))
    const [panel] = computeLayout(project).groups[0]!.panels
    expect(panel!.cuts.map((cut) => cut.order)).toEqual(panel!.cuts.map((_cut, index) => index + 1))
    expect(panel!.cuts.some((cut) => cut.trim)).toBe(false)
  })

  it('commence par quatre coupes de délignage avec une marge', () => {
    let project = furniture(quarter(['A', 'B', 'C']))
    project = value(setLayoutOptions(project, { edgeMargin: 100 }))
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    const cuts = layout.groups[0]!.panels[0]!.cuts
    expect(cuts.slice(0, 4)).toEqual([
      { order: 1, direction: 'along', at: 100, from: 0, to: 28000, offset: 100, trim: true, kerfBefore: true },
      { order: 2, direction: 'along', at: 20600, from: 0, to: 28000, offset: 20500, trim: true, kerfBefore: false },
      { order: 3, direction: 'across', at: 100, from: 100, to: 20600, offset: 100, trim: true, kerfBefore: true },
      { order: 4, direction: 'across', at: 27900, from: 100, to: 20600, offset: 27800, trim: true, kerfBefore: false }
    ])
    expect(cuts.slice(4).every((cut) => !cut.trim)).toBe(true)
  })

  it('rejoue les coupes de tous les cas de référence, avec et sans marge', () => {
    for (const margin of [0, 50, 100]) {
      for (const reference of HAND_CASES.filter((item) => item.items.length > 0)) {
        let project = furniture(reference.items.map((item, index) => [`P${index}`, '', 180, item.sizeX, item.sizeY] as const))
        project = value(setLayoutOptions(project, { kerf: reference.kerf, edgeMargin: 0 }))
        project = value(
          setPanelStock(project, '', 180, {
            length: reference.panel.sizeX + 2 * margin,
            width: reference.panel.sizeY + 2 * margin,
            grain: !reference.rotate
          })
        )
        project = value(setLayoutOptions(project, { edgeMargin: margin }))
        const layout = computeLayout(project)
        expect(verifyLayout(project, layout), `${reference.label}, marge ${margin}`).toBeNull()
        expect(layout.groups[0]?.panelCount, reference.label).toBe(reference.panels)
      }
    }
  })
})

describe('computeLayout : sens du fil (US5)', () => {
  it('avec le sens du fil, ne tourne aucune pièce et demande 4 panneaux au lieu de 2', () => {
    let project = furniture(quarter(['A', 'B', 'C', 'D']))
    project = value(setPanelStock(project, 'Chêne', 180, { length: 20000, width: 10000 }))
    expect(computeLayout(project).groups[0]?.panelCount).toBe(2)
    project = value(setPanelStock(project, 'Chêne', 180, { grain: true }))
    const layout = computeLayout(project)
    expect(verifyLayout(project, layout)).toBeNull()
    expect(layout.groups[0]?.panelCount).toBe(4)
    expect(layout.groups[0]?.panels.every((panel) => panel.placements.every((placement) => !placement.rotated))).toBe(true)
  })

  it('suit la longueur saisie, même plus courte que la largeur, et signale ce qui ne rentrerait que tourné', () => {
    let project = furniture([['Montant', '', 180, 5000, 15000]])
    project = value(setPanelStock(project, '', 180, { length: 20000, width: 10000, grain: true }))
    const layout = computeLayout(project)
    expect(layout.groups[0]?.unplaced).toEqual([
      { pieceId: project.pieces[0]!.id, name: 'Montant', length: 5000, width: 15000, reason: 'grain' }
    ])
    expect(layout.complete).toBe(false)
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
