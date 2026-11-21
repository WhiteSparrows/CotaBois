import type { CutList } from './cutList'
import { formatMm } from './units'

const BOM = '﻿'
const SEPARATOR = ';'
const LINE_END = '\r\n'
const HEADER = ['Quantité', 'Pièces', 'Longueur (mm)', 'Largeur (mm)', 'Épaisseur (mm)', 'Matériau']
const EDGE_HEADER = ['Chants', 'Longueur finie (mm)', 'Largeur finie (mm)', 'Chant (m)']

/** Un texte libre ne doit jamais être exécuté comme une formule, ni casser les colonnes. */
function textCell(text: string): string {
  const neutralized = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[;"\r\n]/.test(neutralized) ? `"${neutralized.replaceAll('"', '""')}"` : neutralized
}

/** Des mètres au centimètre supérieur, avec une virgule décimale ; vide sans chant. */
function metersCell(tenths: number): string {
  if (tenths === 0) return ''
  const centimeters = Math.ceil(tenths / 100)
  return `${Math.floor(centimeters / 100)},${String(centimeters % 100).padStart(2, '0')}`
}

/** Pour les tableurs en configuration française : BOM, point-virgule, virgule décimale et CRLF. */
export function toCsv(cutList: CutList): string {
  // Sans pièce de forme ni chant, le format reste strictement celui de la première version.
  const hasPlans = cutList.lines.some((line) => line.plan !== null)
  const hasEdges = cutList.lines.some((line) => line.edges !== '')
  const header = [...HEADER, ...(hasPlans ? ['Plan'] : []), ...(hasEdges ? EDGE_HEADER : [])]
  const rows = cutList.lines.map((line) =>
    [
      String(line.quantity),
      textCell(line.names.join(', ')),
      formatMm(line.length),
      formatMm(line.width),
      formatMm(line.thickness),
      textCell(line.material),
      ...(hasPlans ? [line.plan === null ? '' : String(line.plan)] : []),
      ...(hasEdges
        ? [line.edges, formatMm(line.finishedLength), formatMm(line.finishedWidth), metersCell(line.edgeLength)]
        : [])
    ].join(SEPARATOR)
  )
  return BOM + [header.join(SEPARATOR), ...rows].map((row) => row + LINE_END).join('')
}
