import { describe, expect, it } from 'vitest'
import { DEFAULT_DRAWER_PARAMS, maxDrawerCount, validateDrawerParams } from '../../src/core/drawers'
import type { DrawerParams } from '../../src/core/model'
import { DRAWER_REFUSALS, REFERENCE_DRAWERS } from '../fixtures/drawer-references'

function refusal(params: DrawerParams) {
  const result = validateDrawerParams(params)
  if (result.ok) throw new Error('La validation aurait dû échouer')
  return result.error
}

describe('validateDrawerParams', () => {
  it('a pour valeurs par défaut le meuble de référence', () => {
    expect(DEFAULT_DRAWER_PARAMS).toEqual(REFERENCE_DRAWERS)
  })

  it('accepte le meuble de référence', () => {
    expect(validateDrawerParams(REFERENCE_DRAWERS)).toEqual({ ok: true, value: REFERENCE_DRAWERS })
  })

  it.each(DRAWER_REFUSALS.map((item) => [item.label, item] as const))('refuse : %s', (_label, item) => {
    const error = refusal(item.params)
    expect(error.field).toBe(item.field)
    expect(error.message.toLowerCase()).toContain(item.contains.toLowerCase())
  })

  it.each([1, 10])('accepte %i tiroir(s) sur une hauteur suffisante', (drawerCount) => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, height: 20000, drawerCount }).ok).toBe(true)
  })

  it('accepte un jeu entre façades de 10 mm', () => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, frontGap: 100 }).ok).toBe(true)
  })

  it('accepte un jeu nul, tant que le tiroir du bas reste au-dessus du dessous', () => {
    // Fond du tiroir du bas à 0 + (2400 − 2000 − 50) / 2 = 17,5 mm : il touche un dessous de 18 mm, pas de 16 mm.
    expect(refusal({ ...REFERENCE_DRAWERS, frontGap: 0 }).field).toBe('boardThickness')
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, frontGap: 0, boardThickness: 160 }).ok).toBe(true)
  })

  it('accepte un meuble sans fond', () => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, backThickness: 0 }).ok).toBe(true)
  })

  it('accepte des jeux et épaisseurs non entiers en millimètres, mais pas en dixièmes', () => {
    expect(validateDrawerParams({ ...REFERENCE_DRAWERS, slideGap: 127 }).ok).toBe(true)
    expect(refusal({ ...REFERENCE_DRAWERS, slideGap: 12.5 }).field).toBe('slideGap')
  })
})

describe('maxDrawerCount', () => {
  it('donne 7 tiroirs au plus sur 720 mm de haut', () => {
    expect(maxDrawerCount(REFERENCE_DRAWERS)).toBe(7)
  })

  it('donne 0 si même un tiroir ne tient pas', () => {
    expect(maxDrawerCount({ ...REFERENCE_DRAWERS, height: 900 })).toBe(0)
  })
})
