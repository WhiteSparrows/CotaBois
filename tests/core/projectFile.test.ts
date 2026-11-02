import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { computeCutList } from '../../src/core/cutList'
import { findOverlaps } from '../../src/core/geometry'
import { createEmptyProject, type Project } from '../../src/core/model'
import { addPiece, newPanelInput, rotatePiece } from '../../src/core/pieces'
import { FORMAT_VERSION, parseProject, safeFileName, serializeProject } from '../../src/core/projectFile'
import type { Result } from '../../src/core/result'

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
    expect(value(parseProject(text))).toEqual({ name: 'Vide', template: null, pieces: [] })
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

  it('écrit le format exact de la version 1, lisible et stable', () => {
    const text = fixture('valid-v1.cotabois')
    expect(serializeProject(value(parseProject(text)))).toBe(text)
  })

  it('indique la version du format', () => {
    expect(JSON.parse(serializeProject(createEmptyProject())).formatVersion).toBe(FORMAT_VERSION)
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
