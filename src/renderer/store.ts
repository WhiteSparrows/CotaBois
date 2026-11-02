import { useSyncExternalStore } from 'react'
import { applyCaisson } from '../core/caisson'
import { canRedo, canUndo, createHistory, pushState, redo as redoHistory, undo as undoHistory, type History } from '../core/history'
import { createEmptyProject, type Axis, type CaissonParams, type Project, type Vector } from '../core/model'
import {
  addPiece,
  duplicatePiece,
  newPanelInput,
  removePieces,
  rotatePiece,
  updatePiece,
  type PieceChanges
} from '../core/pieces'
import type { Result } from '../core/result'
import type { MenuCommand } from '../main/menu'

export interface EditorState {
  project: Project
  selection: readonly string[]
  canUndo: boolean
  canRedo: boolean
  /** Change à chaque fois que la vue doit recadrer le meuble. */
  frameToken: number
}

let history: History = createHistory(createEmptyProject())
let state: EditorState = toState(history, [], 0)
const listeners = new Set<() => void>()

function toState(current: History, selection: readonly string[], frameToken: number): EditorState {
  const ids = new Set(current.present.pieces.map((piece) => piece.id))
  return {
    project: current.present,
    selection: selection.filter((id) => ids.has(id)),
    canUndo: canUndo(current),
    canRedo: canRedo(current),
    frameToken
  }
}

function publish(next: History, selection: readonly string[], frame = false): void {
  history = next
  state = toState(next, selection, state.frameToken + (frame ? 1 : 0))
  listeners.forEach((listener) => listener())
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

const commandHandlers = new Map<MenuCommand, () => void>()

export function registerCommand(command: MenuCommand, handler: () => void): () => void {
  commandHandlers.set(command, handler)
  return () => commandHandlers.delete(command)
}

export function runCommand(command: MenuCommand): void {
  commandHandlers.get(command)?.()
}
