import { describe, expect, it } from 'vitest'
import { iterationsFor, packPanels, type PackResult } from '../../src/core/guillotine'
import { HAND_CASES, realisticCases, type Size } from '../fixtures/layout-references'
import { checkPanel, checkSize } from './layoutChecker'

const RUNS = 200

/** Tous les invariants : chaque pièce une fois, cotes, rotation, surface, trait de scie et coupes rejouées. */
function verify(items: readonly Size[], panel: Size, kerf: number, rotate: boolean, result: PackResult): string | null {
  const seen = new Set<number>()
  for (const [index, packed] of result.panels.entries()) {
    const error = checkPanel({ ...panel, usable: { x: 0, y: 0, ...panel }, kerf }, packed)
    if (error) return `panneau ${index + 1} : ${error}`
    if (packed.placements.length === 0) return `panneau ${index + 1} vide`
    for (const placement of packed.placements) {
      if (seen.has(placement.index)) return `pièce ${placement.index} placée deux fois`
      seen.add(placement.index)
      const sizeError = checkSize(placement, items[placement.index]!, rotate)
      if (sizeError) return `pièce ${placement.index} : ${sizeError}`
    }
  }
  for (const index of result.unplaced) {
    if (seen.has(index)) return `pièce ${index} placée et non placée`
    seen.add(index)
  }
  return seen.size === items.length ? null : `${items.length - seen.size} pièce(s) perdue(s)`
}

describe('packPanels : cas calculés à la main', () => {
  it.each(HAND_CASES.map((reference) => [reference.label, reference] as const))('%s', (_label, reference) => {
    const result = packPanels(reference.items, reference.panel, { kerf: reference.kerf, rotate: reference.rotate, runs: RUNS })
    expect(verify(reference.items, reference.panel, reference.kerf, reference.rotate, result)).toBeNull()
    expect(result.panels).toHaveLength(reference.panels)
    expect(result.unplaced).toHaveLength(reference.unplaced)
  })

  it('pose une pièce seule en gardant la plus grande chute, et donne ses coupes dans l\'ordre', () => {
    // Coupe en travers d'abord : la chute de droite (997 × 1000) est plus grande que celle du haut (2000 × 497).
    const result = packPanels([{ sizeX: 10000, sizeY: 5000 }], { sizeX: 20000, sizeY: 10000 }, { kerf: 30, rotate: false, runs: 0 })
    expect(result.panels).toHaveLength(1)
    const [panel] = result.panels
    expect(panel!.placements).toEqual([{ index: 0, x: 0, y: 0, sizeX: 10000, sizeY: 5000, rotated: false }])
    expect(panel!.cuts).toEqual([
      { direction: 'across', at: 10000, from: 0, to: 10000, offset: 10000 },
      { direction: 'along', at: 5000, from: 0, to: 10000, offset: 5000 }
    ])
    expect(panel!.offcuts).toEqual(
      expect.arrayContaining([
        { x: 10030, y: 0, sizeX: 9970, sizeY: 10000 },
        { x: 0, y: 5030, sizeX: 10000, sizeY: 4970 }
      ])
    )
    expect(panel!.offcuts).toHaveLength(2)
  })

  it('ne compte aucun trait de scie contre un bord : pièce égale au panneau, sans coupe ni chute', () => {
    const [panel] = packPanels([{ sizeX: 20000, sizeY: 10000 }], { sizeX: 20000, sizeY: 10000 }, { kerf: 30, rotate: true, runs: 0 }).panels
    expect(panel!.cuts).toEqual([])
    expect(panel!.offcuts).toEqual([])
  })

  it('ne laisse aucune chute quand le reste ne dépasse pas le trait de scie', () => {
    const [panel] = packPanels([{ sizeX: 19990, sizeY: 10000 }], { sizeX: 20000, sizeY: 10000 }, { kerf: 30, rotate: false, runs: 0 }).panels
    expect(panel!.cuts).toEqual([{ direction: 'across', at: 19990, from: 0, to: 10000, offset: 19990 }])
    expect(panel!.offcuts).toEqual([])
  })

  it('garde une chute de 1 mm au-delà du trait de scie', () => {
    const [panel] = packPanels([{ sizeX: 19960, sizeY: 10000 }], { sizeX: 20000, sizeY: 10000 }, { kerf: 30, rotate: false, runs: 0 }).panels
    expect(panel!.offcuts).toEqual([{ x: 19990, y: 0, sizeX: 10, sizeY: 10000 }])
  })

  it('renvoie les index des pièces trop grandes et place les autres', () => {
    const items = [{ sizeX: 30000, sizeY: 5000 }, { sizeX: 5000, sizeY: 5000 }]
    const result = packPanels(items, { sizeX: 28000, sizeY: 20700 }, { kerf: 30, rotate: true, runs: RUNS })
    expect(result.unplaced).toEqual([0])
    expect(result.panels.flatMap((panel) => panel.placements.map((placement) => placement.index))).toEqual([1])
  })

  it('ne lève aucune exception sans pièce', () => {
    expect(packPanels([], { sizeX: 20000, sizeY: 10000 }, { kerf: 30, rotate: true, runs: RUNS })).toEqual({ panels: [], unplaced: [] })
  })
})

describe('packPanels : résultat reproductible', () => {
  it('donne exactement le même placement à chaque appel', () => {
    const reference = realisticCases()[10]!
    const options = { kerf: reference.kerf, rotate: true, runs: RUNS }
    expect(packPanels(reference.items, reference.panel, options)).toEqual(packPanels(reference.items, reference.panel, options))
  })
})

describe('packPanels : meubles réalistes', () => {
  it.each([true, false])('respecte tous les invariants, rotation permise : %s', (rotate) => {
    for (const reference of realisticCases()) {
      const result = packPanels(reference.items, reference.panel, { kerf: reference.kerf, rotate, runs: 50 })
      expect(verify(reference.items, reference.panel, reference.kerf, rotate, result), reference.label).toBeNull()
    }
  })
})

describe('iterationsFor', () => {
  it.each([
    [0, 4000],
    [7, 4000],
    [8, 3750],
    [200, 150],
    [100_000, 0]
  ])('%i pièces : %i essais', (pieces, runs) => {
    expect(iterationsFor(pieces)).toBe(runs)
  })
})
