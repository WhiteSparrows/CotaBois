import type { Project } from './model'

/** La spec en demande au moins 50 ; les états partagent leurs pièces inchangées. */
export const MAX_HISTORY = 100

export interface History {
  past: readonly Project[]
  present: Project
  future: readonly Project[]
}

export function createHistory(project: Project): History {
  return { past: [], present: project, future: [] }
}

export function pushState(history: History, project: Project): History {
  if (project === history.present) return history
  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY),
    present: project,
    future: []
  }
}

export function canUndo(history: History): boolean {
  return history.past.length > 0
}

export function canRedo(history: History): boolean {
  return history.future.length > 0
}

export function undo(history: History): History {
  const previous = history.past.at(-1)
  if (!previous) return history
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future]
  }
}

export function redo(history: History): History {
  const next = history.future[0]
  if (!next) return history
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1)
  }
}
