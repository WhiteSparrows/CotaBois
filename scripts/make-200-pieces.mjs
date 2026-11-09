// Génère les projets de test de 200 pièces : 20 modules de 10 pièces, tous de largeur différente.
//  - 200-pieces.cotabois : format 1, uniquement des rectangles, pour vérifier la compatibilité ;
//  - 200-pieces-shapes.cotabois : format 2, dont 50 étagères de forme et 10 formes distinctes.
// Usage : node scripts/make-200-pieces.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_COUNT = 20
const SHAPED_MODULES = 10
const HEIGHT = 20000
const DEPTH = 4000
const BOARD = 180
const BACK = 50
const SHELVES = 5

const STRAIGHT = { kind: 'straight' }

function shelfShape(length, width, moduleIndex) {
  const radius = 100 + moduleIndex * 20
  return {
    kind: 'shaped',
    length,
    width,
    corners: { bottomLeft: STRAIGHT, bottomRight: STRAIGHT, topRight: { kind: 'round', radius }, topLeft: { kind: 'round', radius } },
    cutouts: [
      { id: 'c1', kind: 'rectangle', sizeU: 400, sizeV: 200, cornerRadius: 30, fromU: { edge: 'left', distance: 0 }, fromV: { edge: 'bottom', distance: 0 } },
      { id: 'c2', kind: 'rectangle', sizeU: 400, sizeV: 200, cornerRadius: 30, fromU: { edge: 'right', distance: 0 }, fromV: { edge: 'bottom', distance: 0 } },
      { id: 'c3', kind: 'circle', diameter: 500, fromU: { edge: 'left', distance: Math.floor(length / 2) }, fromV: { edge: 'bottom', distance: Math.floor(width / 2) } }
    ]
  }
}

function markerShape(length, width) {
  return {
    kind: 'shaped',
    length,
    width,
    corners: { bottomLeft: { kind: 'round', radius: 100 }, bottomRight: STRAIGHT, topRight: STRAIGHT, topLeft: STRAIGHT },
    cutouts: [{ id: 'c1', kind: 'circle', diameter: 300, fromU: { edge: 'left', distance: 1500 }, fromV: { edge: 'bottom', distance: 1500 } }]
  }
}

function buildPieces(withShapes) {
  const pieces = []

  function add(name, shape, thickness, position, u, v, material = 'Chêne') {
    pieces.push({ id: `p${pieces.length + 1}`, name, shape, thickness, material, position, orientation: { u, v } })
  }
  const rectangle = (length, width) => ({ kind: 'rectangle', length, width })

  let x = 0
  for (let index = 1; index <= MODULE_COUNT; index++) {
    const width = 6000 + index * 200
    const label = `Module ${index}`
    const pieceDepth = DEPTH - BACK
    const inner = width - 2 * BOARD

    add(`${label} - Côté gauche`, rectangle(HEIGHT, pieceDepth), BOARD, { x, y: 0, z: BACK }, '+y', '+z')
    add(`${label} - Côté droit`, rectangle(HEIGHT, pieceDepth), BOARD, { x: x + width - BOARD, y: 0, z: BACK }, '+y', '+z')
    add(`${label} - Dessous`, rectangle(inner, pieceDepth), BOARD, { x: x + BOARD, y: 0, z: BACK }, '+x', '+z')
    add(`${label} - Dessus`, rectangle(inner, pieceDepth), BOARD, { x: x + BOARD, y: HEIGHT - BOARD, z: BACK }, '+x', '+z')
    for (let shelf = 1; shelf <= SHELVES; shelf++) {
      const y = BOARD + Math.round((shelf * (HEIGHT - 2 * BOARD - BOARD)) / (SHELVES + 1))
      const shape = withShapes && index <= SHAPED_MODULES ? shelfShape(inner, pieceDepth, index) : rectangle(inner, pieceDepth)
      add(`${label} - Étagère ${shelf}`, shape, BOARD, { x: x + BOARD, y, z: BACK }, '+x', '+z')
    }
    // Une seule pièce porte ce nom : le scénario de performance la retrouve dans la liste.
    const isMarker = index === 1
    const backShape = withShapes && isMarker ? markerShape(HEIGHT, width) : rectangle(HEIGHT, width)
    add(isMarker ? 'Repère' : `${label} - Fond`, backShape, BACK, { x, y: 0, z: 0 }, '+y', '+x', 'Contreplaqué')

    x += width
  }
  return pieces
}

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures/projects')

function write(fileName, project) {
  writeFileSync(join(fixtures, fileName), `${JSON.stringify(project, null, 2)}\n`)
  console.log(`${project.pieces.length} pièces écrites dans ${fileName}`)
}

write('200-pieces.cotabois', { formatVersion: 1, name: 'Projet de 200 pièces', template: null, pieces: buildPieces(false) })
write('200-pieces-shapes.cotabois', { formatVersion: 2, name: 'Projet de 200 pièces de forme', template: null, pieces: buildPieces(true) })
