import { useEffect, useId, useState } from 'react'
import type { Axis, Piece } from '../../core/model'
import type { CoreError, Result } from '../../core/result'
import { formatMm, parseMm } from '../../core/units'
import {
  deleteSelection,
  duplicateSelection,
  rotateSelection,
  selectPieces,
  updateSelectedPiece,
  useEditor
} from '../store'

interface CommitFieldProps {
  label: string
  value: string
  unit?: string
  /** Applique la saisie ; renvoie l'erreur à afficher si elle est refusée. */
  onCommit(text: string): CoreError | null
}

/** Un champ qui s'applique à la sortie ou avec Entrée, et garde la saisie refusée pour la corriger. */
function CommitField({ label, value, unit, onCommit }: CommitFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<CoreError | null>(null)

  useEffect(() => {
    setDraft(value)
    setError(null)
  }, [value])

  function commit(): void {
    if (draft === value) {
      setError(null)
      return
    }
    setError(onCommit(draft))
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-input">
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={draft}
          aria-invalid={error !== null}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

function failure(result: Result<unknown>): CoreError | null {
  return result.ok ? null : result.error
}

function SinglePieceFields({ piece }: { piece: Piece }) {
  function commitDimension(field: 'length' | 'width' | 'thickness') {
    return (text: string): CoreError | null => {
      const parsed = parseMm(text)
      return parsed.ok ? failure(updateSelectedPiece(piece.id, { [field]: parsed.value })) : parsed.error
    }
  }

  function commitPosition(axis: Axis) {
    return (text: string): CoreError | null => {
      const parsed = parseMm(text)
      if (!parsed.ok) return parsed.error
      return failure(updateSelectedPiece(piece.id, { position: { ...piece.position, [axis]: parsed.value } }))
    }
  }

  return (
    <>
      <CommitField
        label="Nom"
        value={piece.name}
        onCommit={(text) => failure(updateSelectedPiece(piece.id, { name: text }))}
      />
      <CommitField label="Longueur" unit="mm" value={formatMm(piece.shape.length)} onCommit={commitDimension('length')} />
      <CommitField label="Largeur" unit="mm" value={formatMm(piece.shape.width)} onCommit={commitDimension('width')} />
      <CommitField label="Épaisseur" unit="mm" value={formatMm(piece.thickness)} onCommit={commitDimension('thickness')} />
      <CommitField
        label="Matériau"
        value={piece.material}
        onCommit={(text) => failure(updateSelectedPiece(piece.id, { material: text }))}
      />

      <h3>Position</h3>
      <CommitField label="X (largeur)" unit="mm" value={formatMm(piece.position.x)} onCommit={commitPosition('x')} />
      <CommitField label="Y (hauteur)" unit="mm" value={formatMm(piece.position.y)} onCommit={commitPosition('y')} />
      <CommitField label="Z (profondeur)" unit="mm" value={formatMm(piece.position.z)} onCommit={commitPosition('z')} />
    </>
  )
}

export function PiecePanel() {
  const { project, selection } = useEditor()
  const selected = project.pieces.filter((piece) => selection.includes(piece.id))
  const only = selected.length === 1 ? selected[0] : undefined

  return (
    <section className="panel piece-panel" aria-label="Pièce sélectionnée">
      <div className="panel-heading">
        <h2>{only ? 'Pièce' : `${selected.length} pièces sélectionnées`}</h2>
        <button type="button" className="ghost" onClick={() => selectPieces([])}>
          Fermer
        </button>
      </div>

      <div className="button-row">
        <button type="button" className="secondary" onClick={duplicateSelection}>
          Dupliquer
        </button>
        <button type="button" className="secondary danger" onClick={deleteSelection}>
          Supprimer
        </button>
      </div>

      <h3>Pivoter d'un quart de tour</h3>
      <div className="button-row panel-actions">
        {(['X', 'Y', 'Z'] as const).map((axis) => (
          <button
            key={axis}
            type="button"
            className="secondary"
            aria-label={`Pivoter autour de ${axis}`}
            title={`Quart de tour autour de ${axis}`}
            onClick={() => rotateSelection(axis.toLowerCase() as Axis)}
          >
            ↻ {axis}
          </button>
        ))}
      </div>

      {only && <SinglePieceFields key={only.id} piece={only} />}
    </section>
  )
}
