import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { iterationsFor, packPanels } from '../../src/core/guillotine'
import { realisticCases, twoHundredDistinctPieces } from '../fixtures/layout-references'

const BEST_KNOWN_PATH = join(__dirname, '../fixtures/layout-best-known.json')
const UPDATE = process.env['COTABOIS_BEST_KNOWN'] === '1'

/** Mode réservé : une recherche 20 fois plus longue donne le meilleur résultat connu de chaque meuble. */
describe.runIf(UPDATE)('meilleur résultat connu', () => {
  it('est recalculé et enregistré', { timeout: 30 * 60_000 }, () => {
    const best: Record<string, number> = {}
    for (const reference of realisticCases()) {
      const runs = iterationsFor(reference.items.length) * 20
      best[reference.label] = packPanels(reference.items, reference.panel, { kerf: reference.kerf, rotate: true, runs }).panels.length
    }
    writeFileSync(BEST_KNOWN_PATH, `${JSON.stringify(best, null, 2)}\n`)
  })
})

describe.skipIf(UPDATE)('qualité du calepinage (SC-002)', () => {
  it('atteint le meilleur résultat connu dans au moins 90 % des meubles réalistes, sans jamais le dépasser de plus d\'un panneau', () => {
    expect(existsSync(BEST_KNOWN_PATH), 'Lancer une fois les tests avec COTABOIS_BEST_KNOWN=1').toBe(true)
    const best = JSON.parse(readFileSync(BEST_KNOWN_PATH, 'utf8')) as Record<string, number>
    const cases = realisticCases()
    let equal = 0
    const gaps: string[] = []
    for (const reference of cases) {
      const known = best[reference.label]
      expect(known, reference.label).toBeTypeOf('number')
      const runs = iterationsFor(reference.items.length)
      const panels = packPanels(reference.items, reference.panel, { kerf: reference.kerf, rotate: true, runs }).panels.length
      if (panels <= known!) equal++
      if (panels > known! + 1) gaps.push(`${reference.label} : ${panels} au lieu de ${known}`)
    }
    console.log(`Qualité : ${equal} meubles sur ${cases.length} au meilleur résultat connu (${Math.floor((100 * equal) / cases.length)} %)`)
    expect(gaps).toEqual([])
    expect(equal / cases.length).toBeGreaterThanOrEqual(0.9)
  })
})

describe('temps de calcul (SC-005)', () => {
  it('place 200 pièces toutes différentes en moins de 1 s, dans le cœur seul', () => {
    const items = twoHundredDistinctPieces()
    const start = performance.now()
    const result = packPanels(items, { sizeX: 28000, sizeY: 20700 }, { kerf: 30, rotate: true, runs: iterationsFor(items.length) })
    const duration = performance.now() - start
    console.log(`Temps : ${duration.toFixed(0)} ms pour 200 pièces, ${result.panels.length} panneaux`)
    expect(result.unplaced).toEqual([])
    expect(duration).toBeLessThan(1000)
  })
})
