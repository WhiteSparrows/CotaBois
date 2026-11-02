import { useEffect, useMemo, useRef, useState } from 'react'
import { findOverlaps } from '../core/geometry'
import { CaissonForm } from './panels/CaissonForm'
import { CutListPanel } from './panels/CutListPanel'
import { PiecePanel } from './panels/PiecePanel'
import {
  addPanel,
  deleteSelection,
  duplicateSelection,
  movePiece,
  redo,
  registerCommand,
  runCommand,
  selectPieces,
  undo,
  useEditor
} from './store'
import { Viewport } from './viewport/Viewport'
import './styles.css'

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Un champ en cours de saisie s'applique en perdant le focus, pour agir sur un état à jour. */
function commitActiveField(): void {
  if (isTyping(document.activeElement)) (document.activeElement as HTMLElement).blur()
}

const MAX_LISTED_OVERLAPS = 3

export function App() {
  const { project, selection, canUndo, canRedo, frameToken } = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Viewport | null>(null)
  const framedToken = useRef(0)
  const [viewportError, setViewportError] = useState(false)

  const overlaps = useMemo(() => findOverlaps(project), [project])
  const overlappingIds = useMemo(() => new Set(overlaps.flat()), [overlaps])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    try {
      const viewport = new Viewport(container, {
        onPick: (pieceId) => selectPieces(pieceId ? [pieceId] : []),
        onMove: movePiece
      })
      viewportRef.current = viewport
      const unregister = registerCommand('view:frame', () => viewport.frame())
      return () => {
        unregister()
        viewport.dispose()
        viewportRef.current = null
      }
    } catch {
      setViewportError(true)
      return
    }
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.setProject(project)
    viewport.setMarks(selection, overlappingIds)
    if (frameToken !== framedToken.current) {
      framedToken.current = frameToken
      viewport.frame()
    }
  }, [project, selection, overlappingIds, frameToken])

  useEffect(() => {
    const unregister = [
      registerCommand('edit:undo', () => {
        commitActiveField()
        undo()
      }),
      registerCommand('edit:redo', () => {
        commitActiveField()
        redo()
      }),
      registerCommand('edit:duplicate', () => {
        commitActiveField()
        duplicateSelection()
      }),
      registerCommand('edit:delete', deleteSelection)
    ]
    return () => unregister.forEach((remove) => remove())
  }, [])

  useEffect(() => window.cotabois.onMenuCommand(runCommand), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTyping(event.target) || event.ctrlKey || event.altKey || event.metaKey) return
      const key = event.key.toLowerCase()
      if (key === 'f') runCommand('view:frame')
      if (key === 'delete') runCommand('edit:delete')
      if (key === 'escape') selectPieces([])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const nameOf = (id: string) => project.pieces.find((piece) => piece.id === id)?.name ?? ''

  return (
    <div className="app">
      <aside className="side-panel">{selection.length > 0 ? <PiecePanel /> : <CaissonForm />}</aside>

      <main className="viewport-area">
        <div className="viewport" ref={containerRef} data-testid="viewport" data-piece-count="0" />

        <div className="toolbar">
          <button type="button" className="secondary" onClick={addPanel}>
            Ajouter un panneau
          </button>
          <button type="button" className="secondary" onClick={() => runCommand('view:frame')}>
            Recadrer
          </button>
          <button type="button" className="secondary" disabled={!canUndo} onClick={() => runCommand('edit:undo')}>
            Annuler
          </button>
          <button type="button" className="secondary" disabled={!canRedo} onClick={() => runCommand('edit:redo')}>
            Rétablir
          </button>
        </div>

        {viewportError && (
          <p className="viewport-message" role="alert">
            La vue 3D n'a pas pu démarrer sur cet ordinateur. La liste de découpe reste utilisable.
          </p>
        )}
        {!viewportError && project.pieces.length === 0 && (
          <p className="viewport-message">
            Saisissez les dimensions à gauche pour créer un caisson, ou ajoutez un panneau pour dessiner librement.
          </p>
        )}
        {overlaps.length > 0 && (
          <p className="overlap-warning" role="status" data-testid="overlap-warning">
            Pièces qui se chevauchent :{' '}
            {overlaps
              .slice(0, MAX_LISTED_OVERLAPS)
              .map(([a, b]) => `${nameOf(a)} et ${nameOf(b)}`)
              .join(' ; ')}
            {overlaps.length > MAX_LISTED_OVERLAPS && ` ; et ${overlaps.length - MAX_LISTED_OVERLAPS} autres`}
          </p>
        )}
      </main>

      <aside className="side-panel cut-side">
        <CutListPanel />
      </aside>
    </div>
  )
}
