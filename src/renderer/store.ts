import { useSyncExternalStore } from 'react'
import { applyCaisson } from '../core/caisson'
import { toCsv } from '../core/csv'
import { computeCutList } from '../core/cutList'
import { canRedo, canUndo, createHistory, pushState, redo as redoHistory, undo as undoHistory, type History } from '../core/history'
import { createEmptyProject, type Axis, type CaissonParams, type Piece, type Project, type Vector } from '../core/model'
import {
  addCopy,
  addPiece,
  duplicatePiece,
  newPanelInput,
  removePieces,
  renameProject,
  rotatePiece,
  updatePiece,
  type PieceChanges
} from '../core/pieces'
import { parseProject, safeFileName, serializeProject } from '../core/projectFile'
import type { Result } from '../core/result'
import type { MenuCommand } from '../main/menu'

/** Ce qui attend la réponse de l'utilisateur, parce que le projet n'est pas enregistré. */
export type GuardedAction = 'new' | 'open' | 'close'

/** Le contenu de la vue d'impression, pour le temps de l'export en PDF. */
export interface ReportContent {
  imageUrl: string | null
  date: string
}

export interface EditorState {
  project: Project
  selection: readonly string[]
  canUndo: boolean
  canRedo: boolean
  /** Le projet diffère de son dernier enregistrement. */
  dirty: boolean
  pendingAction: GuardedAction | null
  fileError: string | null
  report: ReportContent | null
  /** Change à chaque fois que la vue doit recadrer le meuble. */
  frameToken: number
}

let history: History = createHistory(createEmptyProject())
let savedProject: Project = history.present
let pendingAction: GuardedAction | null = null
let fileError: string | null = null
let report: ReportContent | null = null
let captureReportImage: (() => string) | null = null
/** Propre au logiciel, et conservé d'un projet à l'autre. Les champs utilisent le presse-papiers de Windows. */
let copiedPieces: readonly Piece[] = []
let state: EditorState = toState(history, [], 0)
const listeners = new Set<() => void>()

function toState(current: History, selection: readonly string[], frameToken: number): EditorState {
  const ids = new Set(current.present.pieces.map((piece) => piece.id))
  return {
    project: current.present,
    selection: selection.filter((id) => ids.has(id)),
    canUndo: canUndo(current),
    canRedo: canRedo(current),
    dirty: current.present !== savedProject,
    pendingAction,
    fileError,
    report,
    frameToken
  }
}

function publish(next: History, selection: readonly string[], frame = false): void {
  history = next
  state = toState(next, selection, state.frameToken + (frame ? 1 : 0))
  listeners.forEach((listener) => listener())
}

function refresh(): void {
  publish(history, state.selection)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useEditor(): EditorState {
  return useSyncExternalStore(subscribe, () => state)
}

function nextId(): string {
  return crypto.randomUUID()
}

export function applyCaissonParams(params: CaissonParams): Result<Project> {
  const result = applyCaisson(state.project, params, nextId)
  if (result.ok) publish(pushState(history, result.value), [], true)
  return result
}

export function selectPieces(pieceIds: readonly string[]): void {
  publish(history, pieceIds)
}

export function setProjectName(name: string): Result<Project> {
  const result = renameProject(state.project, name)
  if (result.ok) publish(pushState(history, result.value), state.selection)
  return result
}

export function addPanel(): void {
  const id = nextId()
  const result = addPiece(state.project, newPanelInput(state.project), id)
  if (result.ok) publish(pushState(history, result.value), [id], true)
}

export function duplicateSelection(): void {
  let project = state.project
  const copies: string[] = []
  for (const pieceId of state.selection) {
    const id = nextId()
    const result = duplicatePiece(project, pieceId, id)
    if (result.ok) {
      project = result.value
      copies.push(id)
    }
  }
  if (copies.length > 0) publish(pushState(history, project), copies)
}

export function deleteSelection(): void {
  publish(pushState(history, removePieces(state.project, state.selection)), [])
}

export function copySelection(): void {
  const selected = state.project.pieces.filter((piece) => state.selection.includes(piece.id))
  if (selected.length > 0) copiedPieces = selected
}

export function cutSelection(): void {
  copySelection()
  deleteSelection()
}

/** Une seule action annulable, quel que soit le nombre de pièces collées. */
export function pasteCopiedPieces(): void {
  let project = state.project
  const pasted: string[] = []
  for (const piece of copiedPieces) {
    const id = nextId()
    const result = addCopy(project, piece, id)
    if (result.ok) {
      project = result.value
      pasted.push(id)
    }
  }
  if (pasted.length > 0) publish(pushState(history, project), pasted)
}

export function updateSelectedPiece(pieceId: string, changes: PieceChanges): Result<Project> {
  const result = updatePiece(state.project, pieceId, changes)
  if (result.ok) publish(pushState(history, result.value), state.selection)
  return result
}

export function movePiece(pieceId: string, position: Vector): void {
  updateSelectedPiece(pieceId, { position })
}

export function rotateSelection(axis: Axis): void {
  let project = state.project
  for (const pieceId of state.selection) {
    const result = rotatePiece(project, pieceId, axis)
    if (result.ok) project = result.value
  }
  publish(pushState(history, project), state.selection)
}

export function undo(): void {
  publish(undoHistory(history), state.selection)
}

export function redo(): void {
  publish(redoHistory(history), state.selection)
}

export function dismissFileError(): void {
  fileError = null
  refresh()
}

/** Remplace tout le document : l'historique ne remonte pas avant l'ouverture ou la création. */
function replaceDocument(project: Project): void {
  savedProject = project
  publish(createHistory(project), [], true)
}

async function save(saveAs: boolean): Promise<boolean> {
  const project = state.project
  const text = serializeProject(project)
  const suggestedName = safeFileName(project.name)
  const result = await (saveAs
    ? window.cotabois.saveProjectAs(text, suggestedName)
    : window.cotabois.saveProject(text, suggestedName))

  if (result.status === 'ok') {
    savedProject = project
    fileError = null
  } else if (result.status === 'error') {
    fileError = result.message
  }
  refresh()
  return result.status === 'ok'
}

export function saveProject(): Promise<boolean> {
  return save(false)
}

export function saveProjectAs(): Promise<boolean> {
  return save(true)
}

async function openChosenProject(): Promise<void> {
  const opened = await window.cotabois.openProject()
  if (opened.status === 'canceled') return
  if (opened.status === 'error') {
    fileError = opened.message
    refresh()
    return
  }

  const parsed = parseProject(opened.text)
  if (!parsed.ok) {
    fileError = parsed.error.message
    refresh()
    return
  }
  await window.cotabois.projectOpened()
  fileError = null
  replaceDocument(parsed.value)
}

async function perform(action: GuardedAction): Promise<void> {
  if (action === 'close') {
    window.cotabois.confirmClose()
  } else if (action === 'open') {
    await openChosenProject()
  } else {
    await window.cotabois.newProject()
    fileError = null
    replaceDocument(createEmptyProject())
  }
}

/** Exécute l'action, en demandant d'abord quoi faire si le projet n'est pas enregistré. */
export function requestAction(action: GuardedAction): void {
  if (state.dirty) {
    pendingAction = action
    refresh()
  } else {
    void perform(action)
  }
}

export async function resolvePendingAction(answer: 'save' | 'discard' | 'cancel'): Promise<void> {
  const action = pendingAction
  pendingAction = null
  refresh()
  if (!action || answer === 'cancel') return
  if (answer === 'save' && !(await saveProject())) return
  await perform(action)
}

export function setReportImageSource(capture: (() => string) | null): void {
  captureReportImage = capture
}

function exportFileName(): string {
  return `${safeFileName(state.project.name)} - découpe`
}

/** Les menus restent actifs : sans pièce, on explique pourquoi rien ne se passe. */
function canExport(): boolean {
  if (state.project.pieces.length > 0) return true
  fileError = 'Ajoutez une pièce pour pouvoir exporter la liste de découpe.'
  refresh()
  return false
}

function showExportResult(status: 'ok' | 'canceled', message?: string): void
function showExportResult(status: 'error', message: string): void
function showExportResult(status: 'ok' | 'canceled' | 'error', message?: string): void {
  fileError = status === 'error' ? (message ?? null) : null
  refresh()
}

export async function exportCsv(): Promise<void> {
  if (!canExport()) return
  const result = await window.cotabois.exportCsv(toCsv(computeCutList(state.project)), exportFileName())
  if (result.status === 'error') showExportResult('error', result.message)
  else showExportResult(result.status)
}

function nextFrames(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

export async function exportPdf(): Promise<void> {
  if (report || !canExport()) return

  const imageUrl = captureReportImage?.() ?? null
  if (imageUrl) {
    const image = new Image()
    image.src = imageUrl
    await image.decode()
  }
  report = { imageUrl, date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date()) }
  refresh()
  await nextFrames()

  const result = await window.cotabois.exportPdf(exportFileName())
  report = null
  if (result.status === 'error') showExportResult('error', result.message)
  else showExportResult(result.status)
}

const commandHandlers = new Map<MenuCommand, () => void>()

export function registerCommand(command: MenuCommand, handler: () => void): () => void {
  commandHandlers.set(command, handler)
  return () => commandHandlers.delete(command)
}

export function runCommand(command: MenuCommand): void {
  // Une boîte de dialogue attend une réponse : rien ne doit changer le projet derrière elle.
  if (document.querySelector('dialog[open]')) return
  commandHandlers.get(command)?.()
}
