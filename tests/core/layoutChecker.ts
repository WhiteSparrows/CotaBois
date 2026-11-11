/**
 * Vérificateur indépendant d'un panneau calepiné. Il n'importe rien de l'algorithme : il ne connaît que
 * les invariants de `specs/003-panel-layout/data-model.md`, et rejoue les coupes une à une.
 */

export interface CheckRect {
  x: number
  y: number
  sizeX: number
  sizeY: number
}

export interface CheckPlacement extends CheckRect {
  rotated: boolean
}

export interface CheckCut {
  direction: 'along' | 'across'
  at: number
  from: number
  to: number
  offset: number
  /** Le trait de scie est avant la ligne plutôt qu'après : délignage du bord bas ou gauche. */
  kerfBefore?: boolean
}

export interface CheckedPanel {
  placements: readonly CheckPlacement[]
  offcuts: readonly CheckRect[]
  cuts: readonly CheckCut[]
}

export interface PanelFrame {
  /** Le panneau complet. */
  sizeX: number
  sizeY: number
  /** La surface utile, où doivent se trouver toutes les pièces. */
  usable: CheckRect
  kerf: number
}

const key = (rect: CheckRect) => `${rect.x},${rect.y},${rect.sizeX},${rect.sizeY}`

function inside(inner: CheckRect, outer: CheckRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.sizeX <= outer.x + outer.sizeX &&
    inner.y + inner.sizeY <= outer.y + outer.sizeY
  )
}

function disjoint(a: CheckRect, b: CheckRect): boolean {
  return a.x + a.sizeX <= b.x || b.x + b.sizeX <= a.x || a.y + a.sizeY <= b.y || b.y + b.sizeY <= a.y
}

/** Renvoie la première règle enfreinte, ou `null`. */
export function checkPanel(frame: PanelFrame, panel: CheckedPanel): string | null {
  const { usable, kerf } = frame

  for (const placement of panel.placements) {
    if (placement.sizeX <= 0 || placement.sizeY <= 0) return `pièce vide en ${key(placement)}`
    if (!inside(placement, usable)) return `pièce hors de la surface utile en ${key(placement)}`
  }
  for (const offcut of panel.offcuts) {
    if (offcut.sizeX <= 0 || offcut.sizeY <= 0) return `chute vide en ${key(offcut)}`
    if (!inside(offcut, usable)) return `chute hors de la surface utile en ${key(offcut)}`
  }

  // Invariant 3 : deux pièces sont séparées d'au moins le trait de scie sur un axe.
  const placements = panel.placements
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i]!
      const b = placements[j]!
      const separated =
        a.x + a.sizeX + kerf <= b.x ||
        b.x + b.sizeX + kerf <= a.x ||
        a.y + a.sizeY + kerf <= b.y ||
        b.y + b.sizeY + kerf <= a.y
      if (!separated) return `pièces trop proches : ${key(a)} et ${key(b)}`
    }
  }

  // Invariant 5 : chaque coupe sépare en deux un seul morceau, d'un bord à l'autre.
  let pieces: CheckRect[] = [{ x: 0, y: 0, sizeX: frame.sizeX, sizeY: frame.sizeY }]
  for (const [index, cut] of panel.cuts.entries()) {
    const label = `coupe ${index + 1}`
    const along = cut.direction === 'along'
    const matches = pieces.filter((rect) => {
      const start = along ? rect.x : rect.y
      const end = along ? rect.x + rect.sizeX : rect.y + rect.sizeY
      const low = along ? rect.y : rect.x
      const high = along ? rect.y + rect.sizeY : rect.x + rect.sizeX
      return start === cut.from && end === cut.to && cut.at > low && cut.at < high
    })
    if (matches.length !== 1) return `${label} : ${matches.length} morceau(x) correspondant(s) au lieu de 1`
    const rect = matches[0]!
    const low = along ? rect.y : rect.x
    const high = along ? rect.y + rect.sizeY : rect.x + rect.sizeX
    if (cut.offset !== cut.at - low) return `${label} : distance au bord ${cut.offset} au lieu de ${cut.at - low}`

    const firstEnd = cut.kerfBefore ? cut.at - kerf : cut.at
    const secondStart = cut.kerfBefore ? cut.at : cut.at + kerf
    const parts: Array<[number, number]> = [
      [low, Math.max(low, firstEnd)],
      [Math.min(high, secondStart), high]
    ]
    const children = parts
      .filter(([start, end]) => end > start)
      .map(([start, end]) =>
        along ? { x: rect.x, y: start, sizeX: rect.sizeX, sizeY: end - start } : { x: start, y: rect.y, sizeX: end - start, sizeY: rect.sizeY }
      )
    pieces = [...pieces.filter((candidate) => candidate !== rect), ...children]
  }

  // Après toutes les coupes : exactement les pièces et les chutes annoncées, le reste étant dans la marge.
  const expected = new Map<string, number>()
  for (const rect of [...panel.placements, ...panel.offcuts]) expected.set(key(rect), (expected.get(key(rect)) ?? 0) + 1)
  for (const rect of pieces) {
    const count = expected.get(key(rect)) ?? 0
    if (count > 0) expected.set(key(rect), count - 1)
    else if (!disjoint(rect, usable)) return `morceau obtenu qui n'est ni une pièce ni une chute : ${key(rect)}`
  }
  const missing = [...expected].filter(([, count]) => count > 0).map(([rect]) => rect)
  if (missing.length > 0) return `pièces ou chutes jamais obtenues par les coupes : ${missing.join(' ; ')}`
  return null
}

/** Invariants 2 et 4 : cotes d'une pièce placée, et rotation interdite avec le sens du fil. */
export function checkSize(placement: CheckPlacement, item: { sizeX: number; sizeY: number }, rotate: boolean): string | null {
  const straight = placement.sizeX === item.sizeX && placement.sizeY === item.sizeY && !placement.rotated
  const turned = placement.sizeX === item.sizeY && placement.sizeY === item.sizeX && placement.rotated
  if (!straight && !turned) return `cotes ${placement.sizeX} × ${placement.sizeY} au lieu de ${item.sizeX} × ${item.sizeY}`
  if (turned && !rotate && item.sizeX !== item.sizeY) return 'pièce tournée malgré le sens du fil'
  return null
}
