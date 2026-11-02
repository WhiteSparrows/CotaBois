import { describe, expect, it } from 'vitest'
import { DEFAULT_SNAP_THRESHOLD, snapPosition } from '../../src/core/geometry'
import { createEmptyProject, type Piece, type Project } from '../../src/core/model'

function box(id: string, position: Piece['position']): Piece {
  return {
    id,
    name: id,
    shape: { kind: 'rectangle', length: 1000, width: 1000 },
    thickness: 1000,
    material: '',
    position,
    orientation: { u: '+x', v: '+z' }
  }
}

function project(...pieces: Piece[]): Project {
  return { ...createEmptyProject(), pieces }
}

// « fixe » occupe de 0 à 1000 sur chaque axe.
const scene = project(box('fixe', { x: 0, y: 0, z: 0 }), box('mobile', { x: 5000, y: 5000, z: 5000 }))

describe('snapPosition', () => {
  it('vaut 5 mm par défaut', () => {
    expect(DEFAULT_SNAP_THRESHOLD).toBe(50)
  })

  it("colle la face gauche sur la face droite d'une voisine", () => {
    expect(snapPosition(scene, 'mobile', { x: 1030, y: 5000, z: 5000 })).toEqual({ x: 1000, y: 5000, z: 5000 })
  })

  it('colle la face droite sur la face gauche d\'une voisine', () => {
    expect(snapPosition(scene, 'mobile', { x: -1020, y: 5000, z: 5000 })).toEqual({ x: -1000, y: 5000, z: 5000 })
  })

  it("aligne deux faces de même côté", () => {
    expect(snapPosition(scene, 'mobile', { x: 25, y: 5000, z: 5000 })).toEqual({ x: 0, y: 5000, z: 5000 })
  })

  it('aligne chaque axe indépendamment', () => {
    expect(snapPosition(scene, 'mobile', { x: 1010, y: 990, z: 40 })).toEqual({ x: 1000, y: 1000, z: 0 })
  })

  it('aligne exactement au seuil, et plus au-delà', () => {
    expect(snapPosition(scene, 'mobile', { x: 1050, y: 5000, z: 5000 }).x).toBe(1000)
    expect(snapPosition(scene, 'mobile', { x: 1051, y: 5000, z: 5000 }).x).toBe(1051)
  })

  it('accepte un seuil plus large, par exemple quand la vue est éloignée', () => {
    expect(snapPosition(scene, 'mobile', { x: 1200, y: 5000, z: 5000 }, 300).x).toBe(1000)
  })

  it('choisit la face la plus proche', () => {
    const near = project(box('a', { x: 0, y: 0, z: 0 }), box('b', { x: 1040, y: 9000, z: 9000 }), box('mobile', { x: 5000, y: 5000, z: 5000 }))
    expect(snapPosition(near, 'mobile', { x: 1035, y: 5000, z: 5000 }).x).toBe(1040)
  })

  it('ne s\'aligne pas sur elle-même', () => {
    expect(snapPosition(project(box('mobile', { x: 0, y: 0, z: 0 })), 'mobile', { x: 20, y: 0, z: 0 }).x).toBe(20)
  })

  it('tient compte de l\'orientation de la pièce déplacée', () => {
    const long: Piece = {
      ...box('mobile', { x: 5000, y: 5000, z: 5000 }),
      shape: { kind: 'rectangle', length: 3000, width: 1000 },
      orientation: { u: '+y', v: '+z' }
    }
    const fixed = box('fixe', { x: 0, y: 0, z: 0 })
    // Haute de 3000 sur Y : sa face haute vient à hauteur du bas de la voisine quand y = −3000
    expect(snapPosition(project(fixed, long), 'mobile', { x: 5000, y: -3030, z: 5000 }).y).toBe(-3000)
  })

  it('renvoie la position reçue pour une pièce inconnue', () => {
    expect(snapPosition(scene, 'zzz', { x: 1010, y: 0, z: 0 })).toEqual({ x: 1010, y: 0, z: 0 })
  })
})
