import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { computeCutList } from '../../src/core/cutList'
import { findOverlaps } from '../../src/core/geometry'
import { defaultLayoutSettings, setLayoutOptions, setPanelStock } from '../../src/core/layout'
import { createEmptyProject, type Project } from '../../src/core/model'
import { addPiece, newPanelInput, rotatePiece, setEdges } from '../../src/core/pieces'
import { FORMAT_VERSION, parseProject, safeFileName, serializeProject } from '../../src/core/projectFile'
import type { Result } from '../../src/core/result'
import { REFERENCE_DRAWERS } from '../fixtures/drawer-references'
import { shaped, TABLET } from '../fixtures/shape-references'

function fixture(name: string): string {
  // Git peut convertir les fins de ligne à la récupération du dépôt sous Windows.
  return readFileSync(join(__dirname, '../fixtures/projects', name), 'utf8').replace(/\r\n/g, '\n')
}

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function errorOf(result: Result<Project>) {
  if (result.ok) throw new Error('La lecture aurait dû échouer')
  return result.error
}

type Mutable = Record<string, any>

/** Le fichier valide, modifié par `change`. */
function validWith(change: (data: Mutable) => void): string {
  const data = JSON.parse(fixture('valid-v1.cotabois')) as Mutable
  change(data)
  return JSON.stringify(data)
}

function validV2With(change: (data: Mutable) => void): string {
  const data = JSON.parse(fixture('valid-v2.cotabois')) as Mutable
  change(data)
  return JSON.stringify(data)
}

function complexProject(): Project {
  let id = 0
  const nextId = () => `p${++id}`
  let project = value(
    applyCaisson(
      createEmptyProject(),
      { width: 8005, height: 18000, depth: 4000, boardThickness: 185, backThickness: 35, shelfCount: 3 },
      nextId
    )
  )
  project = value(addPiece(project, { ...newPanelInput(project), name: 'Plinthe « avant »', material: 'Chêne' }, nextId()))
  return value(rotatePiece(project, project.pieces[0]!.id, 'y'))
}

describe('parseProject : fichier valide', () => {
  it('lit le format de la version 1', () => {
    const project = value(parseProject(fixture('valid-v1.cotabois')))
    expect(project.name).toBe('Bibliothèque du salon')
    expect(project.template?.customized).toBe(true)
    expect(project.pieces).toHaveLength(2)
    expect(project.pieces[0]).toEqual({
      id: 'p1',
      name: 'Côté gauche',
      shape: { kind: 'rectangle', length: 18000, width: 3950 },
      thickness: 180,
      material: 'Chêne',
      position: { x: 0, y: 0, z: 50 },
      orientation: { u: '+y', v: '+z' }
    })
  })

  it('accepte un projet sans modèle et sans pièce', () => {
    const text = JSON.stringify({ formatVersion: 1, name: 'Vide', template: null, pieces: [] })
    expect(value(parseProject(text))).toEqual({ name: 'Vide', template: null, layout: defaultLayoutSettings(), pieces: [] })
  })

  it('accepte un BOM en tête de fichier', () => {
    expect(value(parseProject(`﻿${fixture('valid-v1.cotabois')}`)).pieces).toHaveLength(2)
  })
})

describe('serializeProject', () => {
  it('fait un aller-retour strictement égal', () => {
    const project = complexProject()
    expect(value(parseProject(serializeProject(project)))).toEqual(project)
  })

  it('donne la même liste de découpe après réouverture', () => {
    const project = complexProject()
    expect(computeCutList(value(parseProject(serializeProject(project))))).toEqual(computeCutList(project))
  })

  it('écrit le format exact de la version 5, lisible et stable', () => {
    const text = fixture('valid-v5.cotabois')
    expect(serializeProject(value(parseProject(text)))).toBe(text)
  })

  it('indique la version du format', () => {
    expect(FORMAT_VERSION).toBe(5)
    expect(JSON.parse(serializeProject(createEmptyProject())).formatVersion).toBe(5)
  })
})

describe('format version 2 : pièces de forme', () => {
  it('lit les coins et les découpes', () => {
    const shape = value(parseProject(fixture('valid-v2.cotabois'))).pieces[0]?.shape
    expect(shape).toMatchObject({
      kind: 'shaped',
      corners: { bottomRight: { kind: 'chamfer', size: 100 }, topLeft: { kind: 'round', radius: 400 } }
    })
    expect(shape?.kind === 'shaped' && shape.cutouts.map((cutout) => cutout.kind)).toEqual(['rectangle', 'circle'])
  })

  it('fait un aller-retour strictement égal, avec les cotes saisies', () => {
    const project = { ...createEmptyProject(), pieces: [{ ...value(addPiece(createEmptyProject(), newPanelInput(createEmptyProject()), 'p1')).pieces[0]!, shape: TABLET }] }
    expect(value(parseProject(serializeProject(project)))).toEqual(project)
  })

  it('migre la version 1 sans rien changer', () => {
    const project = value(parseProject(fixture('valid-v1.cotabois')))
    expect(project.pieces[0]?.shape).toEqual({ kind: 'rectangle', length: 18000, width: 3950 })
    expect(project.pieces[1]?.shape).toEqual({ kind: 'rectangle', length: 18000, width: 8000 })
  })

  it('lit comme un rectangle une forme sans modification', () => {
    const text = validV2With((d) => {
      d['pieces'][0]['shape'] = { ...shaped(8000, 3000) }
    })
    expect(value(parseProject(text)).pieces[0]?.shape).toEqual({ kind: 'rectangle', length: 8000, width: 3000 })
  })

  it('refuse une version supérieure à 5', () => {
    expect(errorOf(parseProject(validV2With((d) => (d['formatVersion'] = 6)))).code).toBe('format-too-recent')
  })

  it.each<[string, (data: Mutable) => void]>([
    ['coin inconnu', (d) => (d['pieces'][0]['shape']['corners']['topLeft'] = { kind: 'ovale' })],
    ['coin absent', (d) => delete d['pieces'][0]['shape']['corners']['topLeft']],
    ['rayon non numérique', (d) => (d['pieces'][0]['shape']['corners']['topLeft'] = { kind: 'round', radius: '40' })],
    ['découpes absentes', (d) => delete d['pieces'][0]['shape']['cutouts']],
    ['découpe de type inconnu', (d) => (d['pieces'][0]['shape']['cutouts'][1]['kind'] = 'etoile')],
    ['bord inconnu', (d) => (d['pieces'][0]['shape']['cutouts'][1]['fromU']['edge'] = 'bottom')],
    ['distance absente', (d) => delete d['pieces'][0]['shape']['cutouts'][1]['fromV']['distance']],
    ['forme invalide', (d) => (d['pieces'][0]['shape']['cutouts'][1]['diameter'] = 100_000)]
  ])('refuse tout le fichier : %s, en nommant la pièce', (_label, change) => {
    const error = errorOf(parseProject(validV2With(change)))
    expect(error.code).toBe('file-corrupted')
    expect(error.message).toContain('Tablette')
  })
})

function validV3With(change: (data: Mutable) => void): string {
  const data = JSON.parse(fixture('valid-v3.cotabois')) as Mutable
  change(data)
  return JSON.stringify(data)
}

describe('format version 3 : réglages du calepinage', () => {
  it('lit les réglages', () => {
    // La version 4 ajoute aux réglages des valeurs neutres : surlongueur par défaut, chant nul, prix absents.
    const neutral = { edgeThickness: 0, panelPrice: null, edgePrice: null }
    expect(value(parseProject(fixture('valid-v3.cotabois'))).layout).toEqual({
      kerf: 30,
      edgeMargin: 100,
      edgeOverhang: 200,
      panels: [
        { material: '', thickness: 50, length: 25000, width: 12500, grain: false, ...neutral },
        { material: 'Chêne plaqué', thickness: 180, length: 25000, width: 12500, grain: true, ...neutral }
      ]
    })
  })

  it('fait un aller-retour strictement égal des réglages', () => {
    let project = value(setLayoutOptions(complexProject(), { kerf: 25, edgeMargin: 50 }))
    project = value(setPanelStock(project, 'Chêne', 180, { length: 25000, width: 12500, grain: true }))
    expect(value(parseProject(serializeProject(project)))).toEqual(project)
  })

  it.each(['valid-v1.cotabois', 'valid-v2.cotabois'])('migre %s vers les réglages par défaut, sans rien changer d\'autre', (name) => {
    const project = value(parseProject(fixture(name)))
    expect(project.layout).toEqual(defaultLayoutSettings())
    expect(computeCutList(project)).toEqual(computeCutList(value(parseProject(serializeProject(project)))))
  })

  it('écrit les réglages entre le modèle et les pièces', () => {
    expect(Object.keys(JSON.parse(serializeProject(createEmptyProject())))).toEqual(['formatVersion', 'name', 'template', 'layout', 'pieces'])
  })

  it.each<[string, (data: Mutable) => void]>([
    ['réglages absents', (d) => delete d['layout']],
    ['trait de scie hors limites', (d) => (d['layout']['kerf'] = 201)],
    ['trait de scie non numérique', (d) => (d['layout']['kerf'] = '3')],
    ['marge négative', (d) => (d['layout']['edgeMargin'] = -1)],
    ['panneaux qui ne sont pas une liste', (d) => (d['layout']['panels'] = {})],
    ['longueur de panneau nulle', (d) => (d['layout']['panels'][0]['length'] = 0)],
    ['sens du fil non booléen', (d) => (d['layout']['panels'][0]['grain'] = 'oui')],
    ['couple en double', (d) => d['layout']['panels'].push({ ...d['layout']['panels'][1], material: ' chêne plaqué ' })],
    ['marge trop grande pour un panneau', (d) => (d['layout']['edgeMargin'] = 1000) && (d['layout']['panels'][0]['width'] = 2000)]
  ])('refuse tout le fichier : %s', (_label, change) => {
    const error = errorOf(parseProject(validV3With(change)))
    expect(error.code).toBe('file-corrupted')
    expect(error.message).toContain('calepinage')
  })
})

function validV4With(change: (data: Mutable) => void): string {
  const data = JSON.parse(fixture('valid-v4.cotabois')) as Mutable
  change(data)
  return JSON.stringify(data)
}

describe('format version 4 : chants et prix', () => {
  it('lit les chants, les réglages et l\'option du caisson', () => {
    const project = value(parseProject(fixture('valid-v4.cotabois')))
    expect(project.pieces.map((piece) => piece.edges)).toEqual([['top'], ['bottom', 'top', 'left'], undefined])
    expect(project.template?.params.frontEdges).toBe(true)
    expect(project.layout.edgeOverhang).toBe(200)
    expect(project.layout.panels[0]).toEqual({
      material: '',
      thickness: 180,
      length: 28000,
      width: 20700,
      grain: false,
      edgeThickness: 20,
      panelPrice: 4590,
      edgePrice: 85
    })
  })

  it('fait un aller-retour strictement égal des chants et des prix', () => {
    let project = complexProject()
    project = value(setEdges(project, [project.pieces[2]!.id, project.pieces[3]!.id], 'top', true))
    project = value(setEdges(project, [project.pieces[3]!.id], 'left', true))
    project = value(setLayoutOptions(project, { edgeOverhang: 150 }))
    project = value(setPanelStock(project, '', 185, { edgeThickness: 8, panelPrice: 4590, edgePrice: 85 }))
    expect(value(parseProject(serializeProject(project)))).toEqual(project)
  })

  it.each(['valid-v1.cotabois', 'valid-v2.cotabois', 'valid-v3.cotabois'])('migre %s sans chant, sans prix ni option', (name) => {
    const project = value(parseProject(fixture(name)))
    expect(project.pieces.every((piece) => piece.edges === undefined)).toBe(true)
    expect(project.template?.params.frontEdges).toBeUndefined()
    expect(project.layout.edgeOverhang).toBe(200)
    expect(project.layout.panels.every((panel) => panel.edgeThickness === 0 && panel.panelPrice === null && panel.edgePrice === null)).toBe(true)
  })

  it.each<[string, (data: Mutable) => void, string]>([
    ['bord inconnu', (d) => (d['pieces'][0]['edges'] = ['front']), 'Côté gauche'],
    ['bord en double', (d) => (d['pieces'][0]['edges'] = ['top', 'top']), 'Côté gauche'],
    ['chants qui ne sont pas une liste', (d) => (d['pieces'][0]['edges'] = 'top'), 'Côté gauche'],
    ['chants absents', (d) => delete d['pieces'][0]['edges'], 'Côté gauche'],
    ['prix négatif', (d) => (d['layout']['panels'][0]['panelPrice'] = -1), 'calepinage'],
    ['prix non entier', (d) => (d['layout']['panels'][0]['panelPrice'] = 12.5), 'calepinage'],
    ['prix trop élevé', (d) => (d['layout']['panels'][0]['edgePrice'] = 10_000_001), 'calepinage'],
    ['prix en texte', (d) => (d['layout']['panels'][0]['edgePrice'] = '85'), 'calepinage'],
    ['chant trop épais', (d) => (d['layout']['panels'][0]['edgeThickness'] = 101), 'calepinage'],
    ['surlongueur hors limites', (d) => (d['layout']['edgeOverhang'] = 1001), 'calepinage'],
    ['surlongueur absente', (d) => delete d['layout']['edgeOverhang'], 'calepinage'],
    ['option du caisson non booléenne', (d) => (d['template']['params']['frontEdges'] = 'oui'), 'modèle'],
    [
      'cote à couper nulle',
      (d) => {
        d['pieces'][0]['shape']['width'] = 30
        d['layout']['panels'][0]['edgeThickness'] = 30
      },
      'Côté gauche'
    ]
  ])('refuse tout le fichier : %s', (_label, change, cause) => {
    const error = errorOf(parseProject(validV4With(change)))
    expect(error.code).toBe('file-corrupted')
    expect(error.message).toContain(cause)
  })
})

function validV5With(change: (data: Mutable) => void): string {
  const data = JSON.parse(fixture('valid-v5.cotabois')) as Mutable
  change(data)
  return JSON.stringify(data)
}

describe('format version 5 : meuble à tiroirs', () => {
  it('lit le modèle et ses réglages', () => {
    const project = value(parseProject(fixture('valid-v5.cotabois')))
    expect(project.template).toEqual({ kind: 'drawers', params: REFERENCE_DRAWERS, customized: true })
  })

  it('fait un aller-retour strictement égal, option des chants comprise', () => {
    const project: Project = {
      ...createEmptyProject(),
      template: { kind: 'drawers', params: { ...REFERENCE_DRAWERS, frontEdges: true }, customized: false }
    }
    expect(value(parseProject(serializeProject(project)))).toEqual(project)
  })

  it.each(['valid-v1.cotabois', 'valid-v4.cotabois'])('lit encore %s avec son caisson', (name) => {
    expect(value(parseProject(fixture(name))).template?.kind).toBe('caisson')
  })

  it.each<[string, (data: Mutable) => void]>([
    ['modèle inconnu', (d) => (d['template']['kind'] = 'table')],
    ['nombre de tiroirs hors limites', (d) => (d['template']['params']['drawerCount'] = 11)],
    ['jeu entre façades hors limites', (d) => (d['template']['params']['frontGap'] = 101)],
    ['jeu des coulisses hors limites', (d) => (d['template']['params']['slideGap'] = 501)],
    ['réglage absent', (d) => delete d['template']['params']['drawerThickness']],
    ['option des chants non booléenne', (d) => (d['template']['params']['frontEdges'] = 'oui')],
    ['meuble impossible', (d) => (d['template']['params']['depth'] = 2500)]
  ])('refuse tout le fichier : %s', (_label, change) => {
    const error = errorOf(parseProject(validV5With(change)))
    expect(error.code).toBe('file-corrupted')
    expect(error.message).toContain('modèle')
  })
})

describe('projet de 200 pièces', () => {
  it('est un projet valide, sans chevauchement, avec une seule pièce « Repère »', () => {
    const project = value(parseProject(fixture('200-pieces.cotabois')))
    expect(project.pieces).toHaveLength(200)
    expect(findOverlaps(project)).toEqual([])
    expect(project.pieces.filter((piece) => piece.name === 'Repère')).toHaveLength(1)
    expect(computeCutList(project).lines.find((line) => line.names.includes('Repère'))?.quantity).toBe(1)
  })
})

describe('projet de 200 pièces dont 50 de forme', () => {
  it('est valide, sans chevauchement, avec au moins 10 formes distinctes', () => {
    const project = value(parseProject(fixture('200-pieces-shapes.cotabois')))
    const shapedPieces = project.pieces.filter((piece) => piece.shape.kind === 'shaped')
    expect(project.pieces).toHaveLength(200)
    expect(shapedPieces.length).toBeGreaterThanOrEqual(50)
    expect(new Set(shapedPieces.map((piece) => JSON.stringify(piece.shape))).size).toBeGreaterThanOrEqual(10)
    expect(findOverlaps(project)).toEqual([])
  })
})

describe('parseProject : refus', () => {
  it.each(['', '   ', 'bonjour', '{ "formatVersion": 1', fixture('corrupted.cotabois')])(
    'refuse un contenu illisible : %j',
    (text) => {
      expect(errorOf(parseProject(text)).code).toBe('file-corrupted')
    }
  )

  it.each(['[]', '12', 'null', '"texte"', '{}', fixture('no-version.cotabois')])(
    "refuse un JSON qui n'est pas un projet : %j",
    (text) => {
      expect(errorOf(parseProject(text)).code).toBe('not-a-project')
    }
  )

  it.each([0, -1, 1.5, '1', null])('refuse la version de format %j', (formatVersion) => {
    expect(errorOf(parseProject(validWith((d) => (d['formatVersion'] = formatVersion)))).code).toBe('not-a-project')
  })

  it("refuse un format plus récent sans l'ouvrir partiellement, et invite à mettre à jour", () => {
    const error = errorOf(parseProject(fixture('future-version.cotabois')))
    expect(error.code).toBe('format-too-recent')
    expect(error.message).toContain('version plus récente')
  })

  it.each<[string, (data: Mutable) => void, string]>([
    ['nom de projet absent', (d) => delete d['name'], 'nom du projet'],
    ['nom de projet vide', (d) => (d['name'] = '  '), 'nom du projet'],
    ['pièces absentes', (d) => delete d['pieces'], 'pièces'],
    ['pièces qui ne sont pas une liste', (d) => (d['pieces'] = {}), 'pièces'],
    ['pièce qui n\'est pas un objet', (d) => (d['pieces'][0] = 'x'), 'pièce 1'],
    ['identifiant absent', (d) => delete d['pieces'][0]['id'], 'Côté gauche'],
    ['identifiant en double', (d) => (d['pieces'][1]['id'] = 'p1'), 'Fond'],
    ['nom de pièce absent', (d) => delete d['pieces'][0]['name'], 'pièce 1'],
    ['forme absente', (d) => delete d['pieces'][0]['shape'], 'Côté gauche'],
    ['forme inconnue', (d) => (d['pieces'][0]['shape']['kind'] = 'ellipse'), 'Côté gauche'],
    ['longueur hors limites', (d) => (d['pieces'][0]['shape']['length'] = 100_001), 'Côté gauche'],
    ['longueur non numérique', (d) => (d['pieces'][0]['shape']['length'] = '12'), 'Côté gauche'],
    ['épaisseur absente', (d) => delete d['pieces'][1]['thickness'], 'Fond'],
    ['épaisseur décimale', (d) => (d['pieces'][1]['thickness'] = 1.5), 'Fond'],
    ['matériau non textuel', (d) => (d['pieces'][0]['material'] = 3), 'Côté gauche'],
    ['position incomplète', (d) => delete d['pieces'][0]['position']['z'], 'Côté gauche'],
    ['position hors limites', (d) => (d['pieces'][0]['position']['x'] = 5_000_000), 'Côté gauche'],
    ['axe inconnu', (d) => (d['pieces'][0]['orientation']['u'] = '+w'), 'Côté gauche'],
    ['axes parallèles', (d) => (d['pieces'][0]['orientation']['v'] = '-y'), 'Côté gauche'],
    ['modèle inconnu', (d) => (d['template']['kind'] = 'table'), 'modèle'],
    ['modèle sans paramètres', (d) => delete d['template']['params'], 'modèle'],
    ['paramètres incohérents', (d) => (d['template']['params']['width'] = 100), 'modèle'],
    ['customized non booléen', (d) => (d['template']['customized'] = 'oui'), 'modèle']
  ])('refuse %s, en nommant la cause', (_label, change, cause) => {
    const error = errorOf(parseProject(validWith(change)))
    expect(error.code).toBe('file-corrupted')
    expect(error.message).toContain(cause)
  })
})

describe('safeFileName', () => {
  it.each([
    ['Bibliothèque du salon', 'Bibliothèque du salon'],
    ['Meuble: "télé"/salon?', 'Meuble télésalon'],
    ['a<b>c|d*e\\f', 'abcdef'],
    ['  Fin de nom. ', 'Fin de nom'],
    ['???', 'Projet'],
    ['', 'Projet'],
    ['CON', 'Projet CON'],
    ['nul', 'Projet nul']
  ])('transforme %j en %j', (name, expected) => {
    expect(safeFileName(name)).toBe(expected)
  })
})
