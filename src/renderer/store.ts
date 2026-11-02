import { useSyncExternalStore } from 'react'
import { applyCaisson } from '../core/caisson'
import { canRedo, canUndo, createHistory, pushState, redo as redoHistory, undo as undoHistory, type History } from '../core/history'
import { createEmptyProject, type Axis, type CaissonParams, type Project, type Vector } from '../core/model'
import {
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

export interface EditorState {
  project: Project
  selection: readonly string[]
  canUndo: boolean
  canRedo: boolean
  /** Le projet diffère de son dernier enregistrement. */
  dirty: boolean
  pendingAction: GuardedAction | null
  fileError: string | null
  /** Change à chaque fois que la vue doit recadrer le meuble. */
  frameToken: number
}

let history: History = createHistory(createEmptyProject())
let savedProject: Project = history.present
let pendingAction: GuardedAction | null = null
let fileError: string | null = null
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

const commandHandlers = new Map<MenuCommand, () => void>()

export function registerCommand(command: MenuCommand, handler: () => void): () => void {
  commandHandlers.set(command, handler)
  return () => commandHandlers.delete(command)
}

export function runCommand(command: MenuCommand): void {
  commandHandlers.get(command)?.()
}
