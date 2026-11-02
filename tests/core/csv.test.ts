import { describe, expect, it } from 'vitest'
import { toCsv } from '../../src/core/csv'
import { computeCutList, type CutLine } from '../../src/core/cutList'
import { createEmptyProject, type Piece } from '../../src/core/model'

function piece(id: string, name: string, length: number, width: number, thickness: number, material = ''): Piece {
  return {
    id,
    name,
    shape: { kind: 'rectangle', length, width },
    thickness,
    material,
    position: { x: 0, y: 0, z: 0 },
    orientation: { u: '+x', v: '+z' }
  }
}

function line(changes: Partial<CutLine>): CutLine {
  return {
    quantity: 1,
    pieceIds: ['p'],
    names: ['Pièce'],
    length: 1000,
    width: 500,
    thickness: 180,
    material: '',
    ...changes
  }
}

function rows(lines: CutLine[]): string[] {
  return toCsv({ lines, totals: [] }).replace(/^﻿/, '').split('\r\n')
}

const HEADER = 'Quantité;Pièces;Longueur (mm);Largeur (mm);Épaisseur (mm);Matériau'

describe('toCsv', () => {
  it('reproduit exactement le format prévu', () => {
    const cutList = computeCutList({
      ...createEmptyProject(),
      pieces: [
        piece('a', 'Côté gauche', 18000, 3950, 180, 'Chêne'),
        piece('b', 'Côté droit', 18000, 3950, 180, 'Chêne'),
        piece('c', 'Dessous', 7640, 3950, 180, 'Chêne'),
        piece('d', 'Dessus', 7640, 3950, 180, 'Chêne'),
        piece('e', 'Étagère 1', 7640, 3950, 180, 'Chêne'),
        piece('f', 'Étagère 2', 7640, 3950, 180, 'Chêne'),
        piece('g', 'Étagère 3', 7640, 3950, 180, 'Chêne'),
        piece('h', 'Fond', 18000, 8000, 50, 'Contreplaqué')
      ]
    })
    expect(toCsv(cutList)).toBe(
      '﻿' +
        `${HEADER}\r\n` +
        '2;Côté gauche, Côté droit;1800;395;18;Chêne\r\n' +
        '5;Dessous, Dessus, Étagère 1, Étagère 2, Étagère 3;764;395;18;Chêne\r\n' +
        '1;Fond;1800;800;5;Contreplaqué\r\n'
    )
  })

  it('commence par un BOM, pour les accents dans Excel', () => {
    expect(toCsv({ lines: [], totals: [] }).charCodeAt(0)).toBe(0xfeff)
  })

  it('écrit les décimales avec une virgule, sans guillemets', () => {
    expect(rows([line({ length: 7645, width: 3955, thickness: 185 })])[1]).toBe('1;Pièce;764,5;395,5;18,5;')
  })

  it('laisse le matériau vide quand il n\'est pas renseigné', () => {
    expect(rows([line({})])[1]).toBe('1;Pièce;100;50;18;')
  })

  it.each([
    ['Pied; avant', '"Pied; avant"'],
    ['Dit "le grand"', '"Dit ""le grand"""'],
    ['Deux\nlignes', '"Deux\nlignes"'],
    ['Retour\rchariot', '"Retour\rchariot"']
  ])('met entre guillemets %j', (name, expected) => {
    expect(toCsv({ lines: [line({ names: [name] })], totals: [] })).toContain(`1;${expected};100;50;18;`)
  })

  it('protège aussi le matériau', () => {
    expect(rows([line({ material: 'Hêtre; huilé' })])[1]).toBe('1;Pièce;100;50;18;"Hêtre; huilé"')
  })

  it.each([
    ['=1+1', "'=1+1"],
    ['+33', "'+33"],
    ['-5', "'-5"],
    ['@SOMME(A1)', "'@SOMME(A1)"],
    ['\t=1', "'\t=1"]
  ])("empêche un tableur d'exécuter %j", (name, expected) => {
    expect(rows([line({ names: [name] })])[1]).toBe(`1;${expected};100;50;18;`)
    expect(rows([line({ material: name })])[1]).toBe(`1;Pièce;100;50;18;${expected}`)
  })

  it('protège puis met entre guillemets une formule contenant un séparateur', () => {
    expect(rows([line({ names: ['=A1;B1'] })])[1]).toBe(`1;"'=A1;B1";100;50;18;`)
  })

  it('ne touche pas à un texte ordinaire contenant ces signes plus loin', () => {
    expect(rows([line({ names: ['Pied = avant'] })])[1]).toBe('1;Pied = avant;100;50;18;')
  })

  it('n\'exporte que les lignes, sans les totaux', () => {
    const csv = toCsv(computeCutList({ ...createEmptyProject(), pieces: [piece('a', 'A', 1000, 500, 180)] }))
    expect(csv.trimEnd().split('\r\n')).toHaveLength(2)
  })
})
