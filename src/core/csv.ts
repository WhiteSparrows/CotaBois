import type { CutList } from './cutList'
import { formatMm } from './units'

const BOM = '﻿'
const SEPARATOR = ';'
const LINE_END = '\r\n'
const HEADER = ['Quantité', 'Pièces', 'Longueur (mm)', 'Largeur (mm)', 'Épaisseur (mm)', 'Matériau']

/** Un texte libre ne doit jamais être exécuté comme une formule, ni casser les colonnes. */
function textCell(text: string): string {
  const neutralized = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[;"\r\n]/.test(neutralized) ? `"${neutralized.replaceAll('"', '""')}"` : neutralized
}

/** Pour les tableurs en configuration française : BOM, point-virgule, virgule décimale et CRLF. */
export function toCsv(cutList: CutList): string {
  // Sans pièce de forme, le format reste strictement celui de la première version.
  const hasPlans = cutList.lines.some((line) => line.plan !== null)
  const header = hasPlans ? [...HEADER, 'Plan'] : HEADER
  const rows = cutList.lines.map((line) =>
    [
      String(line.quantity),
      textCell(line.names.join(', ')),
      formatMm(line.length),
      formatMm(line.width),
      formatMm(line.thickness),
      textCell(line.material),
      ...(hasPlans ? [line.plan === null ? '' : String(line.plan)] : [])
    ].join(SEPARATOR)
  )
  return BOM + [header.join(SEPARATOR), ...rows].map((row) => row + LINE_END).join('')
}
