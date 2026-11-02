import { validateCaissonParams } from './caisson'
import {
  axisOf,
  validatePiece,
  validateProjectName,
  type CaissonParams,
  type Orientation,
  type Piece,
  type Project,
  type SignedAxis,
  type Template,
  type Vector
} from './model'
import { err, ok, type Result } from './result'

export const FORMAT_VERSION = 1

/**
 * Migrations successives, indexées par la version de départ. Toute évolution incompatible du format
 * ajoute ici une étape, pour que les anciens fichiers restent lisibles.
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {}

const SIGNED_AXES: ReadonlySet<string> = new Set(['+x', '-x', '+y', '-y', '+z', '-z'])

const NOT_A_PROJECT = "Ce fichier n'est pas un projet CotaBois."
const UNREADABLE = "Ce fichier est abîmé ou n'est pas un projet CotaBois."
const TOO_RECENT =
  "Ce projet a été créé par une version plus récente de CotaBois. Mettez le logiciel à jour pour l'ouvrir."

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function corrupted<T = never>(detail: string): Result<T> {
  return err('file-corrupted', `Ce fichier est abîmé. ${detail}`)
}

export function serializeProject(project: Project): string {
  const template = project.template && {
    kind: project.template.kind,
    params: {
      width: project.template.params.width,
      height: project.template.params.height,
      depth: project.template.params.depth,
      boardThickness: project.template.params.boardThickness,
      backThickness: project.template.params.backThickness,
      shelfCount: project.template.params.shelfCount
    },
    customized: project.template.customized
  }
  const pieces = project.pieces.map((piece) => ({
    id: piece.id,
    name: piece.name,
    shape: { kind: piece.shape.kind, length: piece.shape.length, width: piece.shape.width },
    thickness: piece.thickness,
    material: piece.material,
    position: { x: piece.position.x, y: piece.position.y, z: piece.position.z },
    orientation: { u: piece.orientation.u, v: piece.orientation.v }
  }))
  return `${JSON.stringify({ formatVersion: FORMAT_VERSION, name: project.name, template, pieces }, null, 2)}\n`
}

export function parseProject(text: string): Result<Project> {
  let data: unknown
  try {
    data = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return err('file-corrupted', UNREADABLE)
  }

  if (!isRecord(data)) return err('not-a-project', NOT_A_PROJECT)
  const version = data['formatVersion']
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return err('not-a-project', NOT_A_PROJECT)
  }
  if (version > FORMAT_VERSION) return err('format-too-recent', TOO_RECENT)

  let current = data
  for (let from = version; from < FORMAT_VERSION; from++) {
    const migrate = MIGRATIONS[from]
    if (!migrate) return corrupted(`La version de format ${from} n'est pas prise en charge.`)
    current = migrate(current)
  }
  return readProject(current)
}

function readProject(data: Record<string, unknown>): Result<Project> {
  const name = typeof data['name'] === 'string' ? validateProjectName(data['name']) : null
  if (!name?.ok) return corrupted('Le nom du projet est absent ou invalide.')

  const template = readTemplate(data['template'])
  if (!template.ok) return template

  const rawPieces = data['pieces']
  if (!Array.isArray(rawPieces)) return corrupted('La liste des pièces est absente ou invalide.')

  const pieces: Piece[] = []
  const ids = new Set<string>()
  for (const [index, rawPiece] of rawPieces.entries()) {
    const label =
      isRecord(rawPiece) && typeof rawPiece['name'] === 'string'
        ? `« ${rawPiece['name']} »`
        : `la pièce ${index + 1}`
    const piece = readPiece(rawPiece)
    if (!piece.ok) return corrupted(`Problème sur ${label} : ${piece.error.message}`)
    if (ids.has(piece.value.id)) return corrupted(`Problème sur ${label} : son identifiant est en double.`)
    ids.add(piece.value.id)
    pieces.push(piece.value)
  }

  return ok({ name: name.value, template: template.value, pieces })
}

function readTemplate(raw: unknown): Result<Template | null> {
  if (raw === null) return ok(null)
  const invalid = 'Le modèle de meuble est invalide'
  if (!isRecord(raw) || raw['kind'] !== 'caisson' || typeof raw['customized'] !== 'boolean') {
    return corrupted(`${invalid}.`)
  }
  const params = raw['params']
  if (!isRecord(params)) return corrupted(`${invalid}.`)

  const fields = ['width', 'height', 'depth', 'boardThickness', 'backThickness', 'shelfCount'] as const
  if (fields.some((field) => typeof params[field] !== 'number')) return corrupted(`${invalid}.`)
  const validated = validateCaissonParams({
    width: params['width'] as number,
    height: params['height'] as number,
    depth: params['depth'] as number,
    boardThickness: params['boardThickness'] as number,
    backThickness: params['backThickness'] as number,
    shelfCount: params['shelfCount'] as number
  } satisfies CaissonParams)
  if (!validated.ok) return corrupted(`${invalid} : ${validated.error.message}`)
  return ok({ kind: 'caisson', params: validated.value, customized: raw['customized'] })
}

function readVector(raw: unknown): Vector | null {
  if (!isRecord(raw)) return null
  const { x, y, z } = raw
  return typeof x === 'number' && typeof y === 'number' && typeof z === 'number' ? { x, y, z } : null
}

function readOrientation(raw: unknown): Orientation | null {
  if (!isRecord(raw)) return null
  const { u, v } = raw
  if (typeof u !== 'string' || typeof v !== 'string' || !SIGNED_AXES.has(u) || !SIGNED_AXES.has(v)) return null
  return { u: u as SignedAxis, v: v as SignedAxis }
}

function readPiece(raw: unknown): Result<Piece> {
  const invalid = (detail: string) => err<Piece>('invalid-piece', detail)
  if (!isRecord(raw)) return invalid("ce n'est pas une pièce.")

  const { id, name, shape, thickness, material } = raw
  if (typeof id !== 'string' || id === '') return invalid('son identifiant est absent.')
  if (typeof name !== 'string') return invalid('son nom est absent.')
  if (!isRecord(shape) || shape['kind'] !== 'rectangle') return invalid('sa forme est absente ou inconnue.')
  const { length, width } = shape
  if (typeof length !== 'number' || typeof width !== 'number') return invalid('ses cotes sont invalides.')
  if (typeof thickness !== 'number') return invalid('son épaisseur est invalide.')
  if (typeof material !== 'string') return invalid('son matériau est invalide.')

  const position = readVector(raw['position'])
  if (!position) return invalid('sa position est invalide.')
  const orientation = readOrientation(raw['orientation'])
  if (!orientation || axisOf(orientation.u) === axisOf(orientation.v)) {
    return invalid('son orientation est invalide.')
  }

  return validatePiece({
    id,
    name,
    shape: { kind: 'rectangle', length, width },
    thickness,
    material,
    position,
    orientation
  })
}

const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** Un nom de fichier acceptable pour Windows, sans extension. */
export function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim()
    .replace(/[. ]+$/, '')
  if (cleaned === '') return 'Projet'
  return RESERVED_NAMES.test(cleaned) ? `Projet ${cleaned}` : cleaned
}
