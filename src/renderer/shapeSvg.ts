import type { ShapedShape } from '../core/model'
import { shapeOutline, type OutlinePath } from '../core/shape'

const TENTHS_TO_MM = 0.1

function pathData(path: OutlinePath, widthMm: number): string {
  const x = (u: number) => u * TENTHS_TO_MM
  const y = (v: number) => widthMm - v * TENTHS_TO_MM

  const commands = [`M ${x(path.start.u)} ${y(path.start.v)}`]
  for (const segment of path.segments) {
    if (segment.kind === 'line') {
      commands.push(`L ${x(segment.to.u)} ${y(segment.to.v)}`)
    } else {
      // L'axe vertical du SVG descend : un arc direct reste direct à l'écran, soit sweep = 0.
      const radius = segment.radius * TENTHS_TO_MM
      commands.push(`A ${radius} ${radius} 0 0 ${segment.clockwise ? 1 : 0} ${x(segment.to.u)} ${y(segment.to.v)}`)
    }
  }
  commands.push('Z')
  return commands.join(' ')
}

/** Le contour d'une forme, en millimètres, `v` vers le haut, à remplir avec `fill-rule="evenodd"`. */
export function shapeSvgPath(shape: ShapedShape): string {
  const widthMm = shape.width * TENTHS_TO_MM
  const { outer, holes } = shapeOutline(shape)
  return [outer, ...holes].map((path) => pathData(path, widthMm)).join(' ')
}
