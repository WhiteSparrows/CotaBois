import { useEffect, useRef } from 'react'
import { resolvePendingAction } from '../store'

export function UnsavedDialog({ projectName }: { projectName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      role="alertdialog"
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-message"
      onCancel={(event) => {
        event.preventDefault()
        void resolvePendingAction('cancel')
      }}
    >
      <h2 id="unsaved-title">Enregistrer les modifications ?</h2>
      <p id="unsaved-message">« {projectName} » contient des modifications qui ne sont pas enregistrées.</p>
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={() => void resolvePendingAction('cancel')}>
          Annuler
        </button>
        <button type="button" className="secondary" onClick={() => void resolvePendingAction('discard')}>
          Ne pas enregistrer
        </button>
        <button type="button" className="primary" autoFocus onClick={() => void resolvePendingAction('save')}>
          Enregistrer
        </button>
      </div>
    </dialog>
  )
}
