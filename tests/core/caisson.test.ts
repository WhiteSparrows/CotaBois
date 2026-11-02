import { describe, expect, it } from 'vitest'
import { applyCaisson, validateCaissonParams } from '../../src/core/caisson'
import { pieceSize, projectBounds } from '../../src/core/geometry'
import { createEmptyProject, type CaissonParams, type Project } from '../../src/core/model'
import { REFERENCE_CAISSONS } from '../fixtures/reference-furniture'

const REFERENCE: CaissonParams = {
  width: 8000,
  height: 18000,
  depth: 4000,
  boardThickness: 180,
  backThickness: 50,
  shelfCount: 3
}

function ids(): () => string {
  let next = 0
  return () => `p${++next}`
}

function generate(params: CaissonParams = REFERENCE, project: Project = createEmptyProject()): Project {
  const result = applyCaisson(project, params, ids())
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function byName(project: Project, name: string) {
  const piece = project.pieces.find((candidate) => candidate.name === name)
  if (!piece) throw new Error(`Pièce absente : ${name}`)
  return piece
}

describe('applyCaisson', () => {
  it('génère les pièces dans l\'ordre prévu', () => {
    expect(generate().pieces.map((piece) => piece.name)).toEqual([
      'Côté gauche',
      'Côté droit',
      'Dessous',
      'Dessus',
      'Étagère 1',
      'Étagère 2',
      'Étagère 3',
      'Fond'
    ])
  })

  it.each(REFERENCE_CAISSONS.map((c) => [c.label, c] as const))('compte les pièces : %s', (_label, reference) => {
    expect(generate(reference.params).pieces).toHaveLength(reference.pieceCount)
  })

  it('place chaque pièce selon la règle de génération', () => {
    const project = generate()
    expect(byName(project, 'Côté gauche').position).toEqual({ x: 0, y: 0, z: 50 })
    expect(byName(project, 'Côté droit').position).toEqual({ x: 7820, y: 0, z: 50 })
    expect(byName(project, 'Dessous').position).toEqual({ x: 180, y: 0, z: 50 })
    expect(byName(project, 'Dessus').position).toEqual({ x: 180, y: 17820, z: 50 })
    expect(byName(project, 'Fond').position).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('oriente chaque pièce pour occuper le bon volume', () => {
    const project = generate()
    expect(pieceSize(byName(project, 'Côté gauche'))).toEqual({ x: 180, y: 18000, z: 3950 })
    expect(pieceSize(byName(project, 'Dessus'))).toEqual({ x: 7640, y: 180, z: 3950 })
    expect(pieceSize(byName(project, 'Fond'))).toEqual({ x: 8000, y: 18000, z: 50 })
  })

  it('répartit les étagères à intervalles égaux : 445,5, 891 et 1336,5 mm', () => {
    const project = generate()
    expect(byName(project, 'Étagère 1').position.y).toBe(4455)
    expect(byName(project, 'Étagère 2').position.y).toBe(8910)
    expect(byName(project, 'Étagère 3').position.y).toBe(13365)
  })

  it('arrondit la position des étagères au dixième, sans toucher à leurs cotes', () => {
    // 100 mm de hauteur intérieure libre pour 2 étagères : 3 intervalles de 33,33… mm
    const params: CaissonParams = { ...REFERENCE, height: 1400, boardThickness: 100, shelfCount: 2, width: 3000, depth: 1000, backThickness: 0 }
    const project = generate(params)
    const first = byName(project, 'Étagère 1')
    const second = byName(project, 'Étagère 2')
    expect(Number.isInteger(first.position.y)).toBe(true)
    expect(first.position.y).toBe(100 + 333)
    expect(second.position.y).toBe(100 + 100 + 667)
    expect(first.shape).toEqual(second.shape)
  })

  it('occupe exactement les dimensions hors tout, fond compris', () => {
    expect(projectBounds(generate())).toMatchObject({
      min: { x: 0, y: 0, z: 0 },
      size: { x: 8000, y: 18000, z: 4000 }
    })
  })

  it('sans fond, utilise toute la profondeur et ne crée aucun fond', () => {
    const project = generate({ ...REFERENCE, backThickness: 0 })
    expect(project.pieces.map((piece) => piece.name)).not.toContain('Fond')
    expect(byName(project, 'Côté gauche').shape).toEqual({ kind: 'rectangle', length: 18000, width: 4000 })
    expect(byName(project, 'Côté gauche').position.z).toBe(0)
    expect(projectBounds(project)?.size).toEqual({ x: 8000, y: 18000, z: 4000 })
  })

  it('enregistre les paramètres, et conserve le nom du projet', () => {
    const project = generate(REFERENCE, { ...createEmptyProject(), name: 'Bibliothèque' })
    expect(project.name).toBe('Bibliothèque')
    expect(project.template).toEqual({ kind: 'caisson', params: REFERENCE, customized: false })
  })

  it('remplace les pièces existantes et remet customized à false', () => {
    const first = generate()
    const customized: Project = { ...first, template: { kind: 'caisson', params: REFERENCE, customized: true } }
    const second = generate({ ...REFERENCE, shelfCount: 0 }, customized)
    expect(second.pieces).toHaveLength(5)
    expect(second.template?.customized).toBe(false)
  })

  it('donne un identifiant unique à chaque pièce', () => {
    const project = generate()
    expect(new Set(project.pieces.map((piece) => piece.id)).size).toBe(project.pieces.length)
  })

  it('ne modifie jamais le projet reçu', () => {
    const project = createEmptyProject()
    generate(REFERENCE, project)
    expect(project).toEqual(createEmptyProject())
  })

  it('refuse des dimensions impossibles sans rien générer', () => {
    const result = applyCaisson(createEmptyProject(), { ...REFERENCE, width: 300 }, ids())
    expect(result.ok).toBe(false)
  })
})

describe('validateCaissonParams', () => {
  function refusal(changes: Partial<CaissonParams>) {
    const result = validateCaissonParams({ ...REFERENCE, ...changes })
    if (result.ok) throw new Error('La validation aurait dû échouer')
    return result.error
  }

  it('accepte le caisson de référence', () => {
    expect(validateCaissonParams(REFERENCE)).toEqual({ ok: true, value: REFERENCE })
  })

  it.each([
    ['width', 0],
    ['width', 100_001],
    ['width', 1.5],
    ['height', -10],
    ['depth', 0],
    ['boardThickness', 0],
    ['boardThickness', 100_001],
    ['backThickness', -1],
    ['backThickness', 100_001],
    ['backThickness', 0.5]
  ] as const)('refuse %s = %d', (field, value) => {
    expect(refusal({ [field]: value }).field).toBe(field)
  })

  it('accepte un fond à 0', () => {
    expect(validateCaissonParams({ ...REFERENCE, backThickness: 0 }).ok).toBe(true)
  })

  it('exige width > 2 × boardThickness, au sens strict', () => {
    const error = refusal({ width: 360 })
    expect(error.field).toBe('width')
    expect(error.message).toContain('36')
    expect(validateCaissonParams({ ...REFERENCE, width: 361 }).ok).toBe(true)
  })

  it('exige height > 2 × boardThickness, au sens strict', () => {
    expect(refusal({ height: 360, shelfCount: 0 }).field).toBe('height')
    expect(validateCaissonParams({ ...REFERENCE, height: 361, shelfCount: 0 }).ok).toBe(true)
  })

  it('exige depth > backThickness, au sens strict', () => {
    expect(refusal({ depth: 50 }).field).toBe('depth')
    expect(validateCaissonParams({ ...REFERENCE, depth: 51 }).ok).toBe(true)
  })

  it.each([-1, 1.5, 101])('refuse %d étagères', (shelfCount) => {
    expect(refusal({ shelfCount, height: 100_000 }).field).toBe('shelfCount')
  })

  it('accepte de 0 à 100 étagères', () => {
    expect(validateCaissonParams({ ...REFERENCE, height: 100_000, shelfCount: 100 }).ok).toBe(true)
    expect(validateCaissonParams({ ...REFERENCE, shelfCount: 0 }).ok).toBe(true)
  })

  it('exige shelfCount × boardThickness < hauteur intérieure, et indique le maximum', () => {
    // Hauteur intérieure : 1000 − 36 = 964 mm, soit au plus 53 étagères de 18 mm
    const params = { height: 10000 }
    expect(validateCaissonParams({ ...REFERENCE, ...params, shelfCount: 53 }).ok).toBe(true)
    const error = refusal({ ...params, shelfCount: 54 })
    expect(error.field).toBe('shelfCount')
    expect(error.message).toContain('53')
  })

  it('ne propose jamais plus de 100 étagères dans le message', () => {
    expect(refusal({ height: 100_000, shelfCount: 2000 }).message).toContain('100')
  })

  it('tient compte du cas limite où aucune étagère ne rentre', () => {
    // Hauteur intérieure : 400 − 360 = 40, inférieure à l'épaisseur de 180
    const error = refusal({ height: 400, shelfCount: 1 })
    expect(error.field).toBe('shelfCount')
    expect(error.message).toContain('0')
  })
})
