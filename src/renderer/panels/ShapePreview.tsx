import { useRef, useState, type PointerEvent } from 'react'
import type { CornerName, CornerTreatment, Cutout, ShapedShape } from '../../core/model'
import type { CutoutChanges } from '../../core/pieces'
import {
  CORNER_NAMES,
  cornerSize,
  maxCornerSize,
  resolveCutout,
  validateShape,
  type ResolvedCutout
} from '../../core/shape'
import { shapeSvgPath } from '../shapeSvg'

const TENTHS_TO_MM = 0.1
/** Un glissement avance au millimètre près. */
const DRAG_STEP = 10
/** Un trou garde au moins cette matière autour de lui quand on le fait glisser. */
const MIN_WALL = 10

interface ShapePreviewProps {
  shape: ShapedShape
  selectedCutoutId: string | null
  onSelectCutout(cutoutId: string): void
  onCornerCommit(corner: CornerName, treatment: CornerTreatment): void
  onCutoutCommit(cutoutId: string, changes: CutoutChanges): void
}

type Drag =
  | { kind: 'corner'; corner: CornerName }
  | { kind: 'cutout'; cutoutId: string; grabU: number; grabV: number; lockU: boolean; lockV: boolean }

function snapToStep(value: number): number {
  return Math.round(value / DRAG_STEP) * DRAG_STEP
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function isLeft(corner: CornerName): boolean {
  return corner === 'bottomLeft' || corner === 'topLeft'
}

function isBottom(corner: CornerName): boolean {
  return corner === 'bottomLeft' || corner === 'bottomRight'
}

function withSize(treatment: CornerTreatment, size: number): CornerTreatment {
  if (treatment.kind === 'round') return { kind: 'round', radius: size }
  if (treatment.kind === 'chamfer') return { kind: 'chamfer', size }
  return treatment
}

/** La position d'une découpe, ramenée au bord de référence qu'elle utilise déjà. */
function movedCutout(shape: ShapedShape, cutout: Cutout, minU: number, minV: number): Cutout {
  if (cutout.kind === 'circle') {
    const centerU = minU + cutout.diameter / 2
    const centerV = minV + cutout.diameter / 2
    return {
      ...cutout,
      fromU: { edge: cutout.fromU.edge, distance: cutout.fromU.edge === 'left' ? centerU : shape.length - centerU },
      fromV: { edge: cutout.fromV.edge, distance: cutout.fromV.edge === 'bottom' ? centerV : shape.width - centerV }
    }
  }
  return {
    ...cutout,
    fromU: { edge: cutout.fromU.edge, distance: cutout.fromU.edge === 'left' ? minU : shape.length - minU - cutout.sizeU },
    fromV: { edge: cutout.fromV.edge, distance: cutout.fromV.edge === 'bottom' ? minV : shape.width - minV - cutout.sizeV }
  }
}

function touchesLength(shape: ShapedShape, box: ResolvedCutout): boolean {
  return box.kind === 'rectangle' && (box.minU === 0 || box.maxU === shape.length)
}

function touchesWidth(shape: ShapedShape, box: ResolvedCutout): boolean {
  return box.kind === 'rectangle' && (box.minV === 0 || box.maxV === shape.width)
}

/** L'aperçu à plat de la pièce : un glissement ne devient une action qu'au relâchement. */
export function ShapePreview({ shape, selectedCutoutId, onSelectCutout, onCornerCommit, onCutoutCommit }: ShapePreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const [draft, setDraft] = useState<ShapedShape | null>(null)
  const shown = draft ?? shape

  const lengthMm = shown.length * TENTHS_TO_MM
  const widthMm = shown.width * TENTHS_TO_MM
  const largest = Math.max(lengthMm, widthMm)
  const margin = largest * 0.09
  const fontSize = largest * 0.032
  const handleRadius = largest * 0.016

  const toX = (u: number) => u * TENTHS_TO_MM
  const toY = (v: number) => widthMm - v * TENTHS_TO_MM

  function planePoint(event: PointerEvent): { u: number; v: number } {
    const svg = svgRef.current!
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(svg.getScreenCTM()!.inverse())
    return { u: local.x / TENTHS_TO_MM, v: (widthMm - local.y) / TENTHS_TO_MM }
  }

  function startDrag(event: PointerEvent, drag: Drag): void {
    event.stopPropagation()
    dragRef.current = drag
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  function startCutoutDrag(event: PointerEvent, cutout: Cutout): void {
    onSelectCutout(cutout.id)
    const box = resolveCutout(shape, cutout)
    const point = planePoint(event)
    startDrag(event, {
      kind: 'cutout',
      cutoutId: cutout.id,
      grabU: point.u - box.minU,
      grabV: point.v - box.minV,
      // Une encoche reste contre son bord.
      lockU: touchesLength(shape, box),
      lockV: touchesWidth(shape, box)
    })
  }

  function dragCorner(drag: Extract<Drag, { kind: 'corner' }>, point: { u: number; v: number }): void {
    const a = isLeft(drag.corner) ? point.u : shape.length - point.u
    const b = isBottom(drag.corner) ? point.v : shape.width - point.v
    const maximum = maxCornerSize(shape, drag.corner)
    const size = clamp(snapToStep((a + b) / 2), Math.min(DRAG_STEP, maximum), maximum)
    setDraft({ ...shape, corners: { ...shape.corners, [drag.corner]: withSize(shape.corners[drag.corner], size) } })
  }

  function dragCutout(drag: Extract<Drag, { kind: 'cutout' }>, point: { u: number; v: number }): void {
    const cutout = shape.cutouts.find((candidate) => candidate.id === drag.cutoutId)
    if (!cutout) return
    const box = resolveCutout(shape, cutout)
    const sizeU = box.maxU - box.minU
    const sizeV = box.maxV - box.minV

    const offsetToStep = (min: number, size: number) => {
      // Un trou rond se cale au millimètre par son centre, un rectangle par son bord.
      return box.kind === 'circle' ? snapToStep(min + size / 2) - size / 2 : snapToStep(min)
    }
    const minU = drag.lockU ? box.minU : clamp(offsetToStep(point.u - drag.grabU, sizeU), MIN_WALL, shape.length - sizeU - MIN_WALL)
    const minV = drag.lockV ? box.minV : clamp(offsetToStep(point.v - drag.grabV, sizeV), MIN_WALL, shape.width - sizeV - MIN_WALL)

    const moved = movedCutout(shape, cutout, minU, minV)
    const candidate = { ...shape, cutouts: shape.cutouts.map((other) => (other.id === cutout.id ? moved : other)) }
    // Contre un obstacle, la découpe reste à sa dernière position valide.
    if (validateShape(candidate).ok) setDraft(candidate)
  }

  function onPointerMove(event: PointerEvent): void {
    const drag = dragRef.current
    if (!drag) return
    const point = planePoint(event)
    if (drag.kind === 'corner') dragCorner(drag, point)
    else dragCutout(drag, point)
  }

  function onPointerUp(): void {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || !draft) return

    if (drag.kind === 'corner') {
      onCornerCommit(drag.corner, draft.corners[drag.corner])
    } else {
      const moved = draft.cutouts.find((cutout) => cutout.id === drag.cutoutId)
      if (moved) onCutoutCommit(drag.cutoutId, { fromU: moved.fromU, fromV: moved.fromV })
    }
    setDraft(null)
  }

  return (
    <svg
      ref={svgRef}
      className="shape-preview"
      data-testid="shape-preview"
      viewBox={`${-margin} ${-margin} ${lengthMm + 2 * margin} ${widthMm + 2 * margin}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      aria-label="Aperçu à plat de la pièce"
    >
      <path className="shape-body" d={shapeSvgPath(shown)} fillRule="evenodd" />

      <text className="shape-edge" x={lengthMm / 2} y={widthMm + margin * 0.7} fontSize={fontSize} textAnchor="middle">
        Bord bas
      </text>
      <text className="shape-edge" x={lengthMm / 2} y={-margin * 0.3} fontSize={fontSize} textAnchor="middle">
        Bord haut
      </text>
      <text
        className="shape-edge"
        transform={`translate(${-margin * 0.3} ${widthMm / 2}) rotate(-90)`}
        fontSize={fontSize}
        textAnchor="middle"
      >
        Bord gauche
      </text>
      <text
        className="shape-edge"
        transform={`translate(${lengthMm + margin * 0.3} ${widthMm / 2}) rotate(90)`}
        fontSize={fontSize}
        textAnchor="middle"
      >
        Bord droit
      </text>

      {shown.cutouts.map((cutout, index) => {
        const box = resolveCutout(shown, cutout)
        const isSelected = cutout.id === selectedCutoutId
        const handlers = { onPointerDown: (event: PointerEvent) => startCutoutDrag(event, cutout) }
        const className = `shape-cutout${isSelected ? ' selected' : ''}`
        const testId = `cutout-${index}`
        if (box.kind === 'circle') {
          return (
            <circle
              key={cutout.id}
              data-testid={testId}
              className={className}
              cx={toX(box.centerU)}
              cy={toY(box.centerV)}
              r={box.radius * TENTHS_TO_MM}
              {...handlers}
            />
          )
        }
        return (
          <rect
            key={cutout.id}
            data-testid={testId}
            className={className}
            x={toX(box.minU)}
            y={toY(box.maxV)}
            width={(box.maxU - box.minU) * TENTHS_TO_MM}
            height={(box.maxV - box.minV) * TENTHS_TO_MM}
            {...handlers}
          />
        )
      })}

      {CORNER_NAMES.filter((corner) => shown.corners[corner].kind !== 'straight').map((corner) => {
        const size = cornerSize(shown.corners[corner])
        const u = isLeft(corner) ? size : shown.length - size
        const v = isBottom(corner) ? size : shown.width - size
        return (
          <circle
            key={corner}
            data-testid={`corner-handle-${corner}`}
            className="shape-handle"
            cx={toX(u)}
            cy={toY(v)}
            r={handleRadius}
            onPointerDown={(event) => startDrag(event, { kind: 'corner', corner })}
          />
        )
      })}
    </svg>
  )
}
