import type { CutLine } from '../../core/cutList'
import { describeShape, type ShapeNote } from '../../core/shape'
import { formatMm } from '../../core/units'
import { shapeSvgPath } from '../shapeSvg'

const TENTHS_TO_MM = 0.1
const NO_MATERIAL = '—'

/** La surface du dessin sur la page, en millimètres de papier. */
const PAPER_WIDTH_MM = 180
const PAPER_HEIGHT_MM = 80
const PAPER_MARGIN_MM = 13
const PAPER_FONT_MM = 3.1
const PAPER_MARKER_MM = 2.7

interface Area {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface Marker {
  cx: number
  cy: number
}

/** Le numéro ne cache jamais ce qu'il désigne, ni un autre numéro, ni une autre découpe. */
function placeMarkers(notes: readonly ShapeNote[], widthMm: number, radius: number, drawing: Area): Map<number, Marker> {
  const toX = (u: number) => u * TENTHS_TO_MM
  const toY = (v: number) => widthMm - v * TENTHS_TO_MM

  const boxes = new Map<number, Area>()
  for (const note of notes) {
    if (!note.size) continue
    const halfWidth = (note.size.u * TENTHS_TO_MM) / 2
    const halfHeight = (note.size.v * TENTHS_TO_MM) / 2
    boxes.set(note.number, {
      minX: toX(note.at.u) - halfWidth,
      maxX: toX(note.at.u) + halfWidth,
      minY: toY(note.at.v) - halfHeight,
      maxY: toY(note.at.v) + halfHeight
    })
  }

  const placed = new Map<number, Marker>()
  const isFree = (marker: Marker, own: number) =>
    marker.cx - radius >= drawing.minX &&
    marker.cx + radius <= drawing.maxX &&
    marker.cy - radius >= drawing.minY &&
    marker.cy + radius <= drawing.maxY &&
    [...placed.values()].every((other) => Math.hypot(other.cx - marker.cx, other.cy - marker.cy) > radius * 2.15) &&
    [...boxes].every(
      ([number, box]) =>
        number === own ||
        marker.cx + radius < box.minX ||
        marker.cx - radius > box.maxX ||
        marker.cy + radius < box.minY ||
        marker.cy - radius > box.maxY
    )

  // Les coins et les grandes découpes ont une place évidente : ils sont placés d'abord.
  const remaining: ShapeNote[] = []
  for (const note of notes) {
    const cx = toX(note.at.u)
    const cy = toY(note.at.v)
    if (note.corner) {
      const offset = radius * 1.3
      const isLeft = note.corner === 'bottomLeft' || note.corner === 'topLeft'
      const isBottom = note.corner === 'bottomLeft' || note.corner === 'bottomRight'
      placed.set(note.number, { cx: cx + (isLeft ? -offset : offset), cy: cy + (isBottom ? offset : -offset) })
    } else if (note.size && note.size.u * TENTHS_TO_MM >= radius * 5 && note.size.v * TENTHS_TO_MM >= radius * 5) {
      placed.set(note.number, { cx, cy })
    } else {
      remaining.push(note)
    }
  }

  for (const note of remaining) {
    const box = boxes.get(note.number)!
    const cx = toX(note.at.u)
    const cy = toY(note.at.v)
    const gap = radius * 1.35
    const towardsCenter = note.at.v < (widthMm / TENTHS_TO_MM) / 2 ? -1 : 1
    const verticalReach = (box.maxY - box.minY) / 2 + gap
    const horizontalReach = (box.maxX - box.minX) / 2 + gap
    const candidates: Marker[] = [
      { cx, cy: cy + towardsCenter * verticalReach },
      { cx, cy: cy - towardsCenter * verticalReach },
      { cx: cx + horizontalReach, cy },
      { cx: cx - horizontalReach, cy },
      { cx: cx + horizontalReach, cy: cy + towardsCenter * verticalReach },
      { cx: cx - horizontalReach, cy: cy + towardsCenter * verticalReach },
      { cx: cx + horizontalReach, cy: cy - towardsCenter * verticalReach },
      { cx: cx - horizontalReach, cy: cy - towardsCenter * verticalReach }
    ]
    placed.set(note.number, candidates.find((candidate) => isFree(candidate, note.number)) ?? candidates[0]!)
  }
  return placed
}

/** Le plan coté d'une forme : un dessin à l'échelle, des numéros, et leurs cotes en toutes lettres. */
export function ShapePlan({ line }: { line: CutLine }) {
  const shape = line.shape
  if (!shape) return null

  const lengthMm = shape.length * TENTHS_TO_MM
  const widthMm = shape.width * TENTHS_TO_MM

  // Le texte se règle en millimètres de papier : il garde sa taille quelle que soit l'échelle du dessin.
  const paperScale = Math.min(
    (PAPER_WIDTH_MM - 2 * PAPER_MARGIN_MM) / lengthMm,
    (PAPER_HEIGHT_MM - 2 * PAPER_MARGIN_MM) / widthMm
  )
  const margin = PAPER_MARGIN_MM / paperScale
  const fontSize = PAPER_FONT_MM / paperScale
  const markerRadius = PAPER_MARKER_MM / paperScale

  const notes = describeShape(shape)
  const markers = placeMarkers(notes, widthMm, markerRadius, {
    minX: -margin,
    minY: -margin,
    maxX: lengthMm + margin,
    maxY: widthMm + margin
  })

  return (
    <section className="shape-plan" data-testid="shape-plan">
      <h3>
        Plan {line.plan} : {line.names.join(', ')}
      </h3>
      <p className="shape-plan-summary">
        Quantité {line.quantity} · {formatMm(shape.length)} × {formatMm(shape.width)} mm · épaisseur {formatMm(line.thickness)} mm · matériau{' '}
        {line.material || NO_MATERIAL}
      </p>

      <svg
        className="shape-plan-drawing"
        viewBox={`${-margin} ${-margin} ${lengthMm + 2 * margin} ${widthMm + 2 * margin}`}
        role="img"
        aria-label={`Dessin du plan ${line.plan}`}
      >
        <path className="shape-plan-body" d={shapeSvgPath(shape)} fillRule="evenodd" />

        <text x={lengthMm / 2} y={widthMm + margin * 0.8} fontSize={fontSize} textAnchor="middle">
          Bord bas · {formatMm(shape.length)} mm
        </text>
        <text x={lengthMm / 2} y={-margin * 0.42} fontSize={fontSize} textAnchor="middle">
          Bord haut
        </text>
        <text transform={`translate(${-margin * 0.42} ${widthMm / 2}) rotate(-90)`} fontSize={fontSize} textAnchor="middle">
          Bord gauche · {formatMm(shape.width)} mm
        </text>
        <text transform={`translate(${lengthMm + margin * 0.42} ${widthMm / 2}) rotate(90)`} fontSize={fontSize} textAnchor="middle">
          Bord droit
        </text>

        {notes.map((note) => {
          const { cx, cy } = markers.get(note.number)!
          return (
            <g key={note.number} className="shape-plan-marker">
              <circle cx={cx} cy={cy} r={markerRadius} />
              <text x={cx} y={cy} fontSize={markerRadius * 1.25} textAnchor="middle" dominantBaseline="central">
                {note.number}
              </text>
            </g>
          )
        })}
      </svg>

      <table className="report-table shape-plan-table">
        <thead>
          <tr>
            <th scope="col" className="number">N°</th>
            <th scope="col">Élément (cotes en mm)</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr key={note.number}>
              <td className="number strong">{note.number}</td>
              <td>{note.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
