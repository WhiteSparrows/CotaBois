import { describe, expect, it } from 'vitest'
import { formatEuros, formatMeters, formatMm, formatSquareMeters, parseEuros, parseMm } from '../../src/core/units'

const NBSP = ' '

describe('parseEuros', () => {
  it.each([
    ['45,90', 4590],
    ['45.9', 4590],
    ['45', 4500],
    ['0', 0],
    ['0,85', 85],
    ['1 234,50', 123_450],
    [`1${NBSP}234,50`, 123_450],
    ['12 €', 1200],
    ['  7,5€ ', 750],
    ['100 000', 10_000_000]
  ])('lit %j comme %i centimes', (text, cents) => {
    expect(parseEuros(text)).toEqual({ ok: true, value: cents })
  })

  it.each([
    ['-3', 'négatif'],
    ['12,345', 'centime'],
    ['abc', 'par exemple'],
    ['', 'par exemple'],
    ['100 000,01', '100 000']
  ])('refuse %j avec une explication', (text, word) => {
    const result = parseEuros(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message.replaceAll(NBSP, ' ')).toContain(word)
  })
})

describe('formatEuros', () => {
  it.each([
    [4590, `45,90${NBSP}€`],
    [0, `0,00${NBSP}€`],
    [5, `0,05${NBSP}€`],
    [9823, `98,23${NBSP}€`],
    [123_450, `1${NBSP}234,50${NBSP}€`],
    [10_000_000, `100${NBSP}000,00${NBSP}€`]
  ])('affiche %i centimes comme %j', (cents, text) => {
    expect(formatEuros(cents)).toBe(text)
  })
})

describe('formatMeters', () => {
  it.each([
    [74_200, '7,42 m'],
    [75_600, '7,56 m'],
    [74_201, '7,43 m'],
    [99, '0,01 m'],
    [0, '0,00 m']
  ])('affiche %i dixièmes comme %j, au centimètre supérieur', (tenths, text) => {
    expect(formatMeters(tenths)).toBe(text)
  })
})

describe('parseMm', () => {
  it.each([
    ['18,5', 185],
    ['18.5', 185],
    ['18', 180],
    ['0,1', 1],
    [',5', 5],
    ['  1800  ', 18000],
    ['1 800', 18000],
    ['18,50', 185],
    ['-12,5', -125],
    ['0', 0]
  ])('lit %j comme %i dixièmes', (text, expected) => {
    expect(parseMm(text)).toEqual({ ok: true, value: expected })
  })

  it.each(['', '   ', 'abc', '12a', '1,2,3', '--5', ',', '18,'])('refuse %j', (text) => {
    const result = parseMm(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid-number')
  })

  it.each(['18,55', '0,01', '1.234'])('refuse %j, plus précis que 0,1 mm, sans arrondir', (text) => {
    const result = parseMm(text)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('too-precise')
      expect(result.error.message).toContain('0,1 mm')
    }
  })

  it('refuse un nombre trop grand pour rester exact', () => {
    expect(parseMm('99999999999999999999').ok).toBe(false)
  })
})

describe('formatMm', () => {
  it.each([
    [185, '18,5'],
    [180, '18'],
    [1, '0,1'],
    [0, '0'],
    [18000, '1800'],
    [-125, '-12,5'],
    [-5, '-0,5']
  ])('affiche %i comme %j', (tenths, expected) => {
    expect(formatMm(tenths)).toBe(expected)
  })

  it('fait un aller-retour exact avec parseMm', () => {
    for (const tenths of [-100000, -1, 0, 1, 9, 10, 11, 185, 3950, 99999, 100000]) {
      expect(parseMm(formatMm(tenths))).toEqual({ ok: true, value: tenths })
    }
  })
})

describe('formatSquareMeters', () => {
  it.each([
    [0, '0,00'],
    [100_000_000, '1,00'],
    [12_345_678, '0,12'],
    [150_000_000, '1,50'],
    // 1800 × 800 mm = 1,44 m²
    [18000 * 8000, '1,44'],
    // 764 × 395 mm = 0,30178 m²
    [7640 * 3950, '0,30']
  ])('affiche la surface %i comme %j', (area, expected) => {
    expect(formatSquareMeters(area)).toBe(expected)
  })
})
