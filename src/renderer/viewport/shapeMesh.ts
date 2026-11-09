import * as THREE from 'three'
import type { ShapedShape } from '../../core/model'
import { shapeOutline, type OutlinePath } from '../../core/shape'

const TENTHS_TO_MM = 0.1
/** Three.js en double le nombre pour un arc : 16 segments par quart de tour. */
const CURVE_SEGMENTS = 8
/** Au-delà de cet angle seulement, une arête est dessinée : les facettes des arrondis restent lisses. */
const EDGE_THRESHOLD_DEGREES = 30

export interface ShapeGeometries {
  body: THREE.ExtrudeGeometry
  edges: THREE.EdgesGeometry
}

function tracePath(target: THREE.Path, path: OutlinePath): void {
  target.moveTo(path.start.u * TENTHS_TO_MM, path.start.v * TENTHS_TO_MM)
  for (const segment of path.segments) {
    if (segment.kind === 'line') {
      target.lineTo(segment.to.u * TENTHS_TO_MM, segment.to.v * TENTHS_TO_MM)
    } else {
      target.absarc(
        segment.center.u * TENTHS_TO_MM,
        segment.center.v * TENTHS_TO_MM,
        segment.radius * TENTHS_TO_MM,
        segment.startAngle,
        segment.endAngle,
        segment.clockwise
      )
    }
  }
}

function buildGeometries(shape: ShapedShape, thickness: number): ShapeGeometries {
  const { outer, holes } = shapeOutline(shape)
  const profile = new THREE.Shape()
  tracePath(profile, outer)
  for (const hole of holes) {
    const path = new THREE.Path()
    tracePath(path, hole)
    profile.holes.push(path)
  }

  const body = new THREE.ExtrudeGeometry(profile, {
    depth: thickness * TENTHS_TO_MM,
    bevelEnabled: false,
    curveSegments: CURVE_SEGMENTS
  })
  return { body, edges: new THREE.EdgesGeometry(body, EDGE_THRESHOLD_DEGREES) }
}

/** Des pièces identiques partagent leur géométrie ; celles qui ne servent plus sont libérées. */
export class ShapeGeometryCache {
  private readonly entries = new Map<string, ShapeGeometries>()
  private used = new Set<string>()

  get(shape: ShapedShape, thickness: number): ShapeGeometries {
    const key = `${thickness}|${JSON.stringify(shape)}`
    this.used.add(key)
    let entry = this.entries.get(key)
    if (!entry) {
      entry = buildGeometries(shape, thickness)
      this.entries.set(key, entry)
    }
    return entry
  }

  /** À appeler une fois toutes les pièces reconstruites. */
  releaseUnused(): void {
    for (const [key, entry] of this.entries) {
      if (!this.used.has(key)) {
        entry.body.dispose()
        entry.edges.dispose()
        this.entries.delete(key)
      }
    }
    this.used = new Set()
  }

  dispose(): void {
    this.used = new Set()
    this.releaseUnused()
  }
}
