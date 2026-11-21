import { describe, expect, it } from 'vitest'
import { applyCaisson } from '../../src/core/caisson'
import { computeCost } from '../../src/core/cost'
import { computeLayout, setPanelStock, type Layout, type LayoutGroup } from '../../src/core/layout'
import { createEmptyProject, type Project } from '../../src/core/model'
import { setEdges } from '../../src/core/pieces'
import type { Result } from '../../src/core/result'
import { QUICKSTART_COST, REFERENCE_PARAMS, SPEC_COST } from '../fixtures/edge-references'

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

/** Un groupe de calepinage réduit à ce que lit le coût. */
function group(changes: { thickness?: number; panelCount?: number; edgeLength?: number; panelPrice?: number | null; edgePrice?: number | null }): LayoutGroup {
  const { thickness = 180, panelCount = 0, edgeLength = 0, panelPrice = null, edgePrice = null } = changes
  return {
    material: '',
    thickness,
    panelCount,
    edgeCount: edgeLength > 0 ? 1 : 0,
    edgeLength,
    stock: { material: '', thickness, length: 28000, width: 20700, grain: false, edgeThickness: 0, panelPrice, edgePrice, isDefault: false }
  } as unknown as LayoutGroup
}

function layout(...groups: LayoutGroup[]): Layout {
  return { groups, complete: true }
}

function frontEdgedCaisson(): Project {
  let id = 0
  const project = value(applyCaisson(createEmptyProject(), REFERENCE_PARAMS, () => `c${++id}`))
  const front = project.pieces.filter((item) => item.name !== 'Fond').map((item) => item.id)
  return value(setEdges(project, front, 'top', true))
}

describe('computeCost : exemple de la spec', () => {
  it('2 panneaux à 45,90 € et 7,56 m de chant à 0,85 €/m font 98,23 €', () => {
    const cost = computeCost(
      createEmptyProject(),
      layout(group({ panelCount: SPEC_COST.panels, edgeLength: 75_600, panelPrice: SPEC_COST.panelPrice, edgePrice: SPEC_COST.edgePrice }))
    )
    expect(cost.items.map(({ kind, quantity, amount }) => [kind, quantity, amount])).toEqual([
      ['panels', 2, SPEC_COST.panelsAmount],
      ['edge', SPEC_COST.edgeCentimeters, SPEC_COST.edgeAmount]
    ])
    expect(cost).toMatchObject({ total: SPEC_COST.total, complete: true })
  })
})

describe('computeCost : caisson du quickstart', () => {
  it('64,33 € avec tous les prix, puis 52,33 € en total partiel sans le panneau de 5 mm', () => {
    let project = frontEdgedCaisson()
    project = value(setPanelStock(project, '', 180, { panelPrice: QUICKSTART_COST.panel18Price, edgePrice: QUICKSTART_COST.edgePrice }))
    project = value(setPanelStock(project, '', 50, { panelPrice: QUICKSTART_COST.panel5Price }))
    expect(computeCost(project, computeLayout(project))).toMatchObject({ total: QUICKSTART_COST.total, complete: true })

    project = value(setPanelStock(project, '', 50, { panelPrice: null }))
    const partial = computeCost(project, computeLayout(project))
    expect(partial).toMatchObject({ total: QUICKSTART_COST.partialTotal, complete: false })
    expect(partial.items.filter((item) => item.amount === null)).toEqual([
      { kind: 'panels', material: '', thickness: 50, quantity: 1, unitPrice: null, amount: null }
    ])
  })
})

describe('computeCost : cas particuliers', () => {
  it('compte un prix nul pour 0 €, et reste complet', () => {
    expect(computeCost(createEmptyProject(), layout(group({ panelCount: 3, panelPrice: 0 })))).toMatchObject({ total: 0, complete: true })
  })

  it('ignore un groupe sans panneau placé et un chant sans métrage', () => {
    expect(computeCost(createEmptyProject(), layout(group({ panelCount: 0, edgeLength: 0 }))).items).toEqual([])
  })

  it('reste complet sans aucun achat', () => {
    expect(computeCost(createEmptyProject(), layout())).toEqual({ items: [], total: 0, complete: true })
  })

  it('arrondit chaque chant au centime le plus proche, les demis vers le haut', () => {
    // 1 cm à 0,50 €/m : 0,5 centime, arrondi à 1 ; à 0,49 €/m : 0,49 centime, arrondi à 0
    expect(computeCost(createEmptyProject(), layout(group({ edgeLength: 100, edgePrice: 50 }))).total).toBe(1)
    expect(computeCost(createEmptyProject(), layout(group({ edgeLength: 100, edgePrice: 49 }))).total).toBe(0)
  })

  it('additionne les achats déjà arrondis', () => {
    const cost = computeCost(
      createEmptyProject(),
      layout(group({ edgeLength: 100, edgePrice: 50 }), group({ thickness: 50, edgeLength: 100, edgePrice: 50 }))
    )
    expect(cost.items.map((item) => item.amount)).toEqual([1, 1])
    expect(cost.total).toBe(2)
  })

  it('compte le chant au centimètre supérieur, comme le métrage affiché', () => {
    // 1 dixième de chant : 1 cm acheté
    expect(computeCost(createEmptyProject(), layout(group({ edgeLength: 1, edgePrice: 100 }))).items[0]).toMatchObject({ quantity: 1, amount: 1 })
  })
})
