import { describe, expect, it } from 'vitest'
import { pieceBounds, pieceFrame, projectBounds } from '../../src/core/geometry'
import type { Orientation, Piece, Project, SignedAxis } from '../../src/core/model'

const LENGTH = 1000
const WIDTH = 300
const THICKNESS = 20

function piece(orientation: Orientation, id = 'p'): Piece {
  return {
    id,
    name: 'Pièce',
    shape: { kind: 'rectangle', length: LENGTH, width: WIDTH },
    thickness: THICKNESS,
    material: '',
    position: { x: 10, y: 20, z: 30 },
    orientation
  }
}

const AXES: SignedAxis[] = ['+x', '-x', '+y', '-y', '+z', '-z']

function allOrientations(): Orientation[] {
  return AXES.flatMap((u) =>
    AXES.filter((v) => v.at(1) !== u.at(1)).map((v) => ({ u, v }))
  )
}

describe('pieceFrame', () => {
  it.each(allOrientations())('forme un repère direct dans l\'encombrement pour %j', (orientation) => {
    const target = piece(orientation)
    const frame = pieceFrame(target)
    const bounds = pieceBounds(target)
    const cross = {
      x: frame.u.y * frame.v.z - frame.u.z * frame.v.y,
      y: frame.u.z * frame.v.x - frame.u.x * frame.v.z,
      z: frame.u.x * frame.v.y - frame.u.y * frame.v.x
    }
    expect(frame.normal).toEqual(cross)

    // Les huit coins de la pièce, dans son propre repère, tombent exactement sur ceux de l'encombrement.
    for (const a of [0, LENGTH]) {
      for (const b of [0, WIDTH]) {
        for (const c of [0, THICKNESS]) {
          for (const axis of ['x', 'y', 'z'] as const) {
            const value = frame.origin[axis] + a * frame.u[axis] + b * frame.v[axis] + c * frame.normal[axis]
            expect(value === bounds.min[axis] || value === bounds.max[axis]).toBe(true)
          }
        }
      }
    }
  })
})

describe('pieceBounds', () => {
  it('énumère bien les 24 orientations possibles', () => {
    expect(allOrientations()).toHaveLength(24)
  })

  it.each(allOrientations())('place la longueur et la largeur sur leurs axes pour %j', (orientation) => {
    const { min, max } = pieceBounds(piece(orientation))
    const uAxis = orientation.u.charAt(1) as 'x' | 'y' | 'z'
    const vAxis = orientation.v.charAt(1) as 'x' | 'y' | 'z'
    const normal = (['x', 'y', 'z'] as const).find((axis) => axis !== uAxis && axis !== vAxis)!

    expect(min).toEqual({ x: 10, y: 20, z: 30 })
    expect(max[uAxis] - min[uAxis]).toBe(LENGTH)
    expect(max[vAxis] - min[vAxis]).toBe(WIDTH)
    expect(max[normal] - min[normal]).toBe(THICKNESS)
  })
})

describe('projectBounds', () => {
  const empty: Project = { name: 'Vide', pieces: [], template: null }

  it('vaut null sans pièce', () => {
    expect(projectBounds(empty)).toBeNull()
  })

  it("donne l'encombrement d'une seule pièce", () => {
    const project = { ...empty, pieces: [piece({ u: '+x', v: '+y' })] }
    expect(projectBounds(project)).toEqual({
      min: { x: 10, y: 20, z: 30 },
      max: { x: 1010, y: 320, z: 50 },
      size: { x: 1000, y: 300, z: 20 }
    })
  })

  it("englobe toutes les pièces, y compris en coordonnées négatives", () => {
    const far: Piece = { ...piece({ u: '+x', v: '+y' }, 'b'), position: { x: -500, y: 0, z: 0 } }
    const project = { ...empty, pieces: [piece({ u: '+x', v: '+y' }, 'a'), far] }
    expect(projectBounds(project)).toEqual({
      min: { x: -500, y: 0, z: 0 },
      max: { x: 1010, y: 320, z: 50 },
      size: { x: 1510, y: 320, z: 50 }
    })
  })
})
