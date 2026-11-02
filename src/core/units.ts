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

/** Une surface est un produit de dixièmes de mm : 1 m² vaut 100 000 000 unités. */
export function formatSquareMeters(area: number): string {
  const hundredths = Math.round(area / 1_000_000)
  const decimals = String(hundredths % 100).padStart(2, '0')
  return `${Math.floor(hundredths / 100)},${decimals}`
}
