import { err, ok, type Result } from './result'

/** Longueur en dixièmes de millimètre : toujours un entier, pour éviter toute dérive d'arrondi. */
export type Tenths = number

const NUMBER_PATTERN = /^(-?)(\d*)(?:[.,](\d+))?$/

export function parseMm(text: string): Result<Tenths> {
  const cleaned = text.trim().replace(/(?<=\d)\s+(?=\d)/g, '')
  const match = NUMBER_PATTERN.exec(cleaned)
  const integerPart = match?.[2] ?? ''
  const decimalPart = (match?.[3] ?? '').replace(/0+$/, '')
  const hasDigits = integerPart !== '' || match?.[3] !== undefined

  if (!match || !hasDigits) {
    return err('invalid-number', 'Saisissez un nombre, par exemple 18 ou 18,5.')
  }
  if (decimalPart.length > 1) {
    return err('too-precise', 'La précision maximale est de 0,1 mm.')
  }

  const magnitude = Number(integerPart || '0') * 10 + Number(decimalPart || '0')
  if (!Number.isSafeInteger(magnitude)) {
    return err('invalid-number', 'Ce nombre est trop grand.')
  }
  if (magnitude === 0) return ok(0)
  return ok(match[1] === '-' ? -magnitude : magnitude)
}

export function formatMm(tenths: Tenths): string {
  const magnitude = Math.abs(tenths)
  const integerPart = Math.floor(magnitude / 10)
  const decimalPart = magnitude % 10
  const sign = tenths < 0 ? '-' : ''
  return decimalPart === 0 ? `${sign}${integerPart}` : `${sign}${integerPart},${decimalPart}`
}

/** Montant en centimes d'euro : toujours un entier. */
export type Cents = number

/** 100 000 € */
export const MAX_CENTS = 10_000_000

const NBSP = ' '

/** Accepte `45,90`, `45.9`, `1 234,50` ou `12 €` ; refuse le négatif et ce qui est plus précis que le centime. */
export function parseEuros(text: string): Result<Cents> {
  const trimmed = text.trim().replace(/\s*€$/, '').trim()
  if (trimmed.startsWith('-')) return err('invalid-price', 'Un prix ne peut pas être négatif.')
  const compact = trimmed.replace(/(?<=\d)[\s  ]+(?=\d)/g, '')
  const match = /^(\d+)(?:[.,](\d+))?$/.exec(compact)
  if (!match) return err('invalid-price', 'Saisissez un prix en euros, par exemple 45,90.')
  const decimals = match[2] ?? ''
  if (decimals.length > 2) return err('too-precise', 'Les prix se saisissent au centime près.')
  const cents = Number(match[1]) * 100 + Number(decimals.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) {
    return err('invalid-price', `Un prix ne peut pas dépasser 100${NBSP}000${NBSP}€.`)
  }
  return ok(cents)
}

/** `1 234,50 €`, avec des espaces insécables. */
export function formatEuros(cents: Cents): string {
  const euros = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${euros},${String(cents % 100).padStart(2, '0')}${NBSP}€`
}

/** Un métrage arrondi au centimètre supérieur : on n'achète jamais trop court. */
export function formatMeters(tenths: Tenths): string {
  const centimeters = Math.ceil(tenths / 100)
  return `${Math.floor(centimeters / 100)},${String(centimeters % 100).padStart(2, '0')} m`
}

/** Une surface est un produit de dixièmes de mm : 1 m² vaut 100 000 000 unités. */
export function formatSquareMeters(area: number): string {
  const hundredths = Math.round(area / 1_000_000)
  const decimals = String(hundredths % 100).padStart(2, '0')
  return `${Math.floor(hundredths / 100)},${decimals}`
}
