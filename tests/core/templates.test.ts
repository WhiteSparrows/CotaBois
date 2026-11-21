import { describe, expect, it } from 'vitest'
import { applyCaisson, carcassPieces } from '../../src/core/caisson'
import { applyDrawerCabinet } from '../../src/core/drawers'
import { createEmptyProject } from '../../src/core/model'
import { applyTemplate, TEMPLATE_LABELS } from '../../src/core/templates'
import { REFERENCE_DRAWERS } from '../fixtures/drawer-references'
import { REFERENCE_CAISSONS } from '../fixtures/reference-furniture'

function ids(): () => string {
  let next = 0
  return () => `p${++next}`
}

describe('applyTemplate', () => {
  it.each(REFERENCE_CAISSONS.map((c) => [c.label, c] as const))('génère le même caisson : %s', (_label, reference) => {
    const project = createEmptyProject()
    expect(applyTemplate(project, { kind: 'caisson', params: reference.params }, ids())).toEqual(
      applyCaisson(project, reference.params, ids())
    )
  })

  it('aiguille vers le meuble à tiroirs', () => {
    const project = createEmptyProject()
    const result = applyTemplate(project, { kind: 'drawers', params: REFERENCE_DRAWERS }, ids())
    expect(result).toEqual(applyDrawerCabinet(project, REFERENCE_DRAWERS, ids()))
    expect(result.ok && result.value.template?.kind).toBe('drawers')
  })

  it('nomme les deux modèles', () => {
    expect(TEMPLATE_LABELS).toEqual({ caisson: 'Caisson', drawers: 'Meuble à tiroirs' })
  })
})

describe('carcassPieces', () => {
  it.each(REFERENCE_CAISSONS.map((c) => [c.label, c] as const))('est le caisson sans étagère : %s', (_label, reference) => {
    const params = { ...reference.params, shelfCount: 0 }
    const caisson = applyCaisson(createEmptyProject(), params, ids())
    if (!caisson.ok) throw new Error(caisson.error.message)
    expect(carcassPieces(params, ids())).toEqual(caisson.value.pieces)
  })
})
