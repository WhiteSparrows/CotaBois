import { useEffect, useMemo, useRef, useState } from 'react'
import { findOverlaps } from '../core/geometry'
import { CaissonForm } from './panels/CaissonForm'
import { CommitField } from './panels/CommitField'
import { CutListPanel } from './panels/CutListPanel'
import { LayoutView } from './panels/LayoutView'
import { PiecePanel } from './panels/PiecePanel'
import { ShapeEditor } from './panels/ShapeEditor'
import { UnsavedDialog } from './panels/UnsavedDialog'
import { CuttingPlanReport } from './report/CuttingPlanReport'
import { ReportView } from './report/ReportView'
import {
  addPanel,
  closeLayout,
  copySelection,
  cutSelection,
  deleteSelection,
  dismissFileError,
  duplicateSelection,
  exportCsv,
  exportCuttingPlan,
  exportPdf,
  movePiece,
  openLayout,
  pasteCopiedPieces,
  redo,
  registerCommand,
  requestAction,
  runCommand,
  saveProject,
  saveProjectAs,
  selectPieces,
  setProjectName,
  setReportImageSource,
  togglePieceSelection,
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
  const { project, selection, canUndo, canRedo, dirty, pendingAction, fileError, report, shapeEditorOpen, layoutOpen, frameToken } =
    useEditor()
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
        onPick: (pieceId, additive) => {
          if (additive) {
            if (pieceId) togglePieceSelection(pieceId)
          } else {
            selectPieces(pieceId ? [pieceId] : [])
          }
        },
        onMove: movePiece
      })
      viewportRef.current = viewport
      const unregister = registerCommand('view:frame', () => viewport.frame())
      setReportImageSource(() => viewport.captureImage())
      return () => {
        unregister()
        setReportImageSource(null)
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
    const afterCommit = (action: () => void) => () => {
      commitActiveField()
      action()
    }
    // Dans un champ, ces commandes portent sur le texte ; ailleurs, sur les pièces.
    const onPiecesOrText = (textAction: 'cut' | 'copy' | 'paste', onPieces: () => void) => () => {
      if (isTyping(document.activeElement)) window.cotabois.editText(textAction)
      else onPieces()
    }
    const unregister = [
      registerCommand('file:new', afterCommit(() => requestAction('new'))),
      registerCommand('file:open', afterCommit(() => requestAction('open'))),
      registerCommand('file:save', afterCommit(() => void saveProject())),
      registerCommand('file:save-as', afterCommit(() => void saveProjectAs())),
      registerCommand('file:export-pdf', afterCommit(() => void exportPdf())),
      registerCommand('file:export-csv', afterCommit(() => void exportCsv())),
      registerCommand('file:export-cutting-plan', afterCommit(() => void exportCuttingPlan())),
      registerCommand('view:3d', afterCommit(closeLayout)),
      registerCommand('view:layout', afterCommit(openLayout)),
      registerCommand('edit:undo', afterCommit(undo)),
      registerCommand('edit:redo', afterCommit(redo)),
      registerCommand('edit:cut', onPiecesOrText('cut', cutSelection)),
      registerCommand('edit:copy', onPiecesOrText('copy', copySelection)),
      registerCommand('edit:paste', onPiecesOrText('paste', pasteCopiedPieces)),
      registerCommand('edit:duplicate', afterCommit(duplicateSelection)),
      registerCommand('edit:delete', deleteSelection)
    ]
    return () => unregister.forEach((remove) => remove())
  }, [])

  useEffect(() => window.cotabois.onMenuCommand(runCommand), [])
  useEffect(() => window.cotabois.onCloseRequested(() => requestAction('close')), [])

  useEffect(() => {
    window.cotabois.setDirty(dirty)
    document.title = `${dirty ? '* ' : ''}${project.name} – CotaBois`
  }, [dirty, project.name])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      // Dans un champ, le navigateur gère seul la saisie et le presse-papiers.
      if (isTyping(event.target) || event.altKey || event.metaKey) return
      const key = event.key.toLowerCase()
      if (event.ctrlKey) {
        if (key === 'x') runCommand('edit:cut')
        if (key === 'c') runCommand('edit:copy')
        if (key === 'v') runCommand('edit:paste')
        return
      }
      if (key === 'f') runCommand('view:frame')
      if (key === 'delete') runCommand('edit:delete')
      if (key === 'escape' && !document.querySelector('dialog[open]')) selectPieces([])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const nameOf = (id: string) => project.pieces.find((piece) => piece.id === id)?.name ?? ''

  return (
    <>
    <div className="app">
      <aside className="side-panel">
        <div className="panel project-panel">
          <CommitField
            label="Nom du projet"
            value={project.name}
            onCommit={(text) => {
              const result = setProjectName(text)
              return result.ok ? null : result.error
            }}
          />
        </div>
        {selection.length > 0 ? <PiecePanel /> : <CaissonForm />}
      </aside>

      <main className="viewport-area">
        <div className="viewport" ref={containerRef} data-testid="viewport" data-piece-count="0" />
        {layoutOpen && <LayoutView />}

        <div className="toolbar">
          <div className="view-switch" role="group" aria-label="Vue">
            <button type="button" className="secondary" aria-pressed={!layoutOpen} onClick={() => runCommand('view:3d')}>
              Vue 3D
            </button>
            <button type="button" className="secondary" aria-pressed={layoutOpen} onClick={() => runCommand('view:layout')}>
              Calepinage
            </button>
          </div>
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

        {fileError && (
          <div className="file-error" role="alert" data-testid="file-error">
            <p>{fileError}</p>
            <button type="button" className="ghost" onClick={dismissFileError}>
              Fermer
            </button>
          </div>
        )}
        {viewportError && (
          <p className="viewport-message" role="alert">
            La vue 3D n'a pas pu démarrer sur cet ordinateur. La liste de découpe reste utilisable.
          </p>
        )}
        {!viewportError && !layoutOpen && project.pieces.length === 0 && (
          <p className="viewport-message">
            Saisissez les dimensions à gauche pour créer un caisson, ou ajoutez un panneau pour dessiner librement.
          </p>
        )}
        {!layoutOpen && overlaps.length > 0 && (
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

      <aside className="side-panel cut-side">{shapeEditorOpen ? <ShapeEditor /> : <CutListPanel />}</aside>

      {pendingAction && <UnsavedDialog projectName={project.name} />}
    </div>
    {report?.kind === 'cut-list' && <ReportView project={project} content={report} />}
    {report?.kind === 'cutting-plan' && <CuttingPlanReport project={project} content={report} />}
    </>
  )
}
