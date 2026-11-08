// Génère tests/fixtures/projects/200-pieces.cotabois : 20 modules de 10 pièces, tous de largeur différente.
// Usage : node scripts/make-200-pieces.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_COUNT = 20
const HEIGHT = 20000
const DEPTH = 4000
const BOARD = 180
const BACK = 50
const SHELVES = 5

const pieces = []

function add(name, length, width, thickness, position, u, v, material = 'Chêne') {
  pieces.push({
    id: `p${pieces.length + 1}`,
    name,
    shape: { kind: 'rectangle', length, width },
    thickness,
    material,
    position,
    orientation: { u, v }
  })
}

let x = 0
for (let index = 1; index <= MODULE_COUNT; index++) {
  const width = 6000 + index * 200
  const label = `Module ${index}`
  const pieceDepth = DEPTH - BACK
  const inner = width - 2 * BOARD

  add(`${label} - Côté gauche`, HEIGHT, pieceDepth, BOARD, { x, y: 0, z: BACK }, '+y', '+z')
  add(`${label} - Côté droit`, HEIGHT, pieceDepth, BOARD, { x: x + width - BOARD, y: 0, z: BACK }, '+y', '+z')
  add(`${label} - Dessous`, inner, pieceDepth, BOARD, { x: x + BOARD, y: 0, z: BACK }, '+x', '+z')
  add(`${label} - Dessus`, inner, pieceDepth, BOARD, { x: x + BOARD, y: HEIGHT - BOARD, z: BACK }, '+x', '+z')
  for (let shelf = 1; shelf <= SHELVES; shelf++) {
    const y = BOARD + Math.round((shelf * (HEIGHT - 2 * BOARD - BOARD)) / (SHELVES + 1))
    add(`${label} - Étagère ${shelf}`, inner, pieceDepth, BOARD, { x: x + BOARD, y, z: BACK }, '+x', '+z')
  }
  // Une seule pièce porte ce nom : le scénario de performance la retrouve dans la liste.
  add(index === 1 ? 'Repère' : `${label} - Fond`, HEIGHT, width, BACK, { x, y: 0, z: 0 }, '+y', '+x', 'Contreplaqué')

  x += width
}

const project = { formatVersion: 1, name: 'Projet de 200 pièces', template: null, pieces }
const target = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures/projects/200-pieces.cotabois')
writeFileSync(target, `${JSON.stringify(project, null, 2)}\n`)
console.log(`${pieces.length} pièces écrites dans ${target}`)
