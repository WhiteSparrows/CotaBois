import { useId } from 'react'
import type { LaidOutPanel, LayoutCut } from '../../core/layout'
import { formatMm, type Tenths } from '../../core/units'
import { placementDetail } from '../layoutText'

const TO_MM = 0.1

/** La surface du dessin sur la page, en millimètres de papier : le texte garde la même taille à toute échelle. */
const PAPER_WIDTH_MM = 180
const PAPER_MAX_HEIGHT_MM = 118
const PAPER_MARGIN_MM = 9
const PAPER_FONT_MM = 2.6

/** Largeur approchée d'un texte, pour décider s'il tient dans sa pièce. */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.56
}

interface LegendEntry {
  letter: string
  names: string
  detail: string
}

/** Les pièces de la légende prennent des lettres : les numéros sont réservés aux coupes. */
function legendLetter(index: number): string {
  let letters = ''
  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    letters = String.fromCharCode(65 + ((rest - 1) % 26)) + letters
  }
  return letters
}

const PAPER_CUT_MARKER_MM = 1.9

interface LayoutDrawingProps {
  panel: LaidOutPanel
  length: Tenths
  width: Tenths
  margin: Tenths
  label: string
  tableClassName: string
  /** À l'écran, le tableau des coupes se déplie ; sur papier, il est toujours visible. */
  foldCuts: boolean
}

function cutName(cut: LayoutCut): string {
  const direction = cut.direction === 'along' ? 'en long' : 'en travers'
  return cut.trim ? `Délignage ${direction}` : direction === 'en long' ? 'En long' : 'En travers'
}

/** Les distances, dans l'ordre : la cote de chaque coupe se mesure depuis le bord du morceau en cours. */
function CutsTable({ cuts, className }: { cuts: readonly LayoutCut[]; className: string }) {
  return (
    <>
      <table className={`${className} layout-cuts-table`}>
        <thead>
          <tr>
            <th scope="col" className="number">N°</th>
            <th scope="col">Coupe</th>
            <th scope="col" className="number">Distance au bord du morceau</th>
            <th scope="col" className="number">Longueur</th>
          </tr>
        </thead>
        <tbody>
          {cuts.map((cut) => (
            <tr key={cut.order}>
              <td className="number strong">{cut.order}</td>
              <td>{cutName(cut)}</td>
              <td className="number">{formatMm(cut.offset)} mm</td>
              <td className="number">{formatMm(cut.to - cut.from)} mm</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="layout-cuts-note">
        Distance mesurée depuis le bord bas du morceau pour une coupe en long, depuis son bord gauche pour une coupe en travers,
        le panneau étant orienté comme sur le dessin.
      </p>
    </>
  )
}

/** Les numéros sont posés sur leur ligne de coupe, près de son début, sans se recouvrir. */
function placeCutMarkers(cuts: readonly LayoutCut[], widthMm: number, radius: number) {
  const placed: Array<{ order: number; cx: number; cy: number }> = []
  const isFree = (cx: number, cy: number) => placed.every((other) => Math.hypot(other.cx - cx, other.cy - cy) > radius * 2.1)
  for (const cut of cuts) {
    const start = cut.from * TO_MM + radius * 1.4
    const end = cut.to * TO_MM - radius * 1.4
    const line = cut.at * TO_MM
    const point = (along: number) =>
      cut.direction === 'along' ? { cx: along, cy: widthMm - line } : { cx: line, cy: widthMm - along }
    let chosen = point((start + end) / 2)
    for (let along = start; along <= end; along += radius * 2.3) {
      const candidate = point(along)
      if (isFree(candidate.cx, candidate.cy)) {
        chosen = candidate
        break
      }
    }
    placed.push({ order: cut.order, ...chosen })
  }
  return placed
}

/** Un panneau à l'échelle, longueur à l'horizontale : pièces, chutes et marge. */
export function LayoutDrawing({ panel, length, width, margin, label, tableClassName, foldCuts }: LayoutDrawingProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const lengthMm = length * TO_MM
  const widthMm = width * TO_MM
  const scale = Math.min((PAPER_WIDTH_MM - 2 * PAPER_MARGIN_MM) / lengthMm, (PAPER_MAX_HEIGHT_MM - 2 * PAPER_MARGIN_MM) / widthMm)
  const pad = PAPER_MARGIN_MM / scale
  const font = PAPER_FONT_MM / scale
  const hatch = `url(#${id}-hatch)`
  const markerRadius = PAPER_CUT_MARKER_MM / scale
  const markers = placeCutMarkers(panel.cuts, widthMm, markerRadius)

  const box = (rect: { x: Tenths; y: Tenths; sizeX: Tenths; sizeY: Tenths }) => ({
    x: rect.x * TO_MM,
    y: widthMm - (rect.y + rect.sizeY) * TO_MM,
    width: rect.sizeX * TO_MM,
    height: rect.sizeY * TO_MM
  })

  const legend: LegendEntry[] = []
  const pieces = panel.placements.map((placement, index) => {
    const area = box(placement)
    const names = placement.names.join(', ')
    const detail = placementDetail(placement)
    const centerX = area.x + area.width / 2
    const centerY = area.y + area.height / 2
    const fits = (across: number, along: number) =>
      across >= font * 2.9 && textWidth(names, font) <= along - font && textWidth(detail, font) <= along - font
    const label = (
      <>
        <text x={0} y={-font * 0.15} fontSize={font} textAnchor="middle" className="layout-piece-name">
          {names}
        </text>
        <text x={0} y={font * 1.05} fontSize={font} textAnchor="middle">
          {detail}
        </text>
      </>
    )

    let content
    if (fits(area.height, area.width)) {
      content = <g transform={`translate(${centerX} ${centerY})`}>{label}</g>
    } else if (fits(area.width, area.height)) {
      // Une pièce étroite et haute, comme un côté de caisson : le texte se lit de bas en haut.
      content = <g transform={`translate(${centerX} ${centerY}) rotate(-90)`}>{label}</g>
    } else {
      const letter = legendLetter(legend.length)
      legend.push({ letter, names, detail })
      const size = Math.min(font, (area.width * 0.9) / letter.length, area.height * 0.7)
      content = (
        <text x={centerX} y={centerY} fontSize={size} textAnchor="middle" dominantBaseline="central" className="layout-piece-name">
          {letter}
        </text>
      )
    }
    return (
      <g key={index} className="layout-piece" data-testid="layout-piece">
        <rect {...area} />
        {content}
      </g>
    )
  })

  const marginPath =
    margin > 0
      ? `M0 0H${lengthMm}V${widthMm}H0Z M${margin * TO_MM} ${margin * TO_MM}V${widthMm - margin * TO_MM}H${lengthMm - margin * TO_MM}V${margin * TO_MM}Z`
      : null

  return (
    <div className="layout-drawing-block">
      <svg
        className="layout-drawing"
        viewBox={`${-pad} ${-pad} ${lengthMm + 2 * pad} ${widthMm + 2 * pad}`}
        role="img"
        aria-label={label}
      >
        <defs>
          <pattern id={`${id}-hatch`} width={font * 0.9} height={font * 0.9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2={font * 0.9} className="layout-hatch-line" />
          </pattern>
        </defs>

        <rect className="layout-board" x={0} y={0} width={lengthMm} height={widthMm} />
        {marginPath && <path className="layout-margin" d={marginPath} fill={hatch} fillRule="evenodd" />}

        {panel.offcuts.map((offcut, index) => {
          const area = box(offcut)
          const text = `${formatMm(offcut.sizeX)} × ${formatMm(offcut.sizeY)}`
          const size = font * 0.85
          return (
            <g key={index} className="layout-offcut">
              <rect {...area} fill={hatch} />
              {area.height >= size * 1.8 && textWidth(text, size) <= area.width - size && (
                <text x={area.x + area.width / 2} y={area.y + area.height / 2} fontSize={size} textAnchor="middle" dominantBaseline="central">
                  {text}
                </text>
              )}
            </g>
          )
        })}

        {pieces}

        {markers.map((marker) => (
          <g key={marker.order} className="layout-cut" data-testid="layout-cut">
            <circle cx={marker.cx} cy={marker.cy} r={markerRadius} />
            <text x={marker.cx} y={marker.cy} fontSize={markerRadius * 1.15} textAnchor="middle" dominantBaseline="central">
              {marker.order}
            </text>
          </g>
        ))}

        <text x={lengthMm / 2} y={widthMm + pad * 0.72} fontSize={font} textAnchor="middle">
          {formatMm(length)} mm
        </text>
        <text transform={`translate(${-pad * 0.4} ${widthMm / 2}) rotate(-90)`} fontSize={font} textAnchor="middle">
          {formatMm(width)} mm
        </text>
      </svg>

      {legend.length > 0 && (
        <table className={`${tableClassName} layout-legend`}>
          <thead>
            <tr>
              <th scope="col" className="number">Repère</th>
              <th scope="col">Pièces</th>
              <th scope="col">Cotes (mm)</th>
            </tr>
          </thead>
          <tbody>
            {legend.map((entry) => (
              <tr key={entry.letter}>
                <td className="number strong">{entry.letter}</td>
                <td>{entry.names}</td>
                <td>{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {panel.cuts.length > 0 &&
        (foldCuts ? (
          <details className="layout-cuts">
            <summary>Ordre des coupes ({panel.cuts.length})</summary>
            <CutsTable cuts={panel.cuts} className={tableClassName} />
          </details>
        ) : (
          <div className="layout-cuts">
            <CutsTable cuts={panel.cuts} className={tableClassName} />
          </div>
        ))}
    </div>
  )
}
