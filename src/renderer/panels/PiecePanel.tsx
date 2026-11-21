import { useState } from 'react'
import { EDGE_LABELS } from '../../core/edges'
import { EDGE_NAMES, type Axis, type EdgeName, type Piece } from '../../core/model'
import type { CoreError, Result } from '../../core/result'
import { formatMm, parseMm } from '../../core/units'
import {
  deleteSelection,
  duplicateSelection,
  openShapeEditor,
  rotateSelection,
  selectPieces,
  setEdgeOfSelection,
  updateSelectedPiece,
  useEditor
} from '../store'
import { CommitField } from './CommitField'

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

/** Une case par bord ; avec plusieurs pièces, cochée si toutes ont ce chant. */
function EdgeFields({ pieces }: { pieces: readonly Piece[] }) {
  const [error, setError] = useState<string | null>(null)
  const first = pieces[0]!
  const sameOrientation = pieces.every(
    (piece) => piece.shape.length === piece.shape.width ? first.shape.length === first.shape.width : (piece.shape.length > piece.shape.width) === (first.shape.length > first.shape.width)
  )

  function kind(edge: EdgeName): string {
    if (!sameOrientation || first.shape.length === first.shape.width) return ''
    const alongLength = edge === 'bottom' || edge === 'top'
    return alongLength === first.shape.length > first.shape.width ? 'long' : 'court'
  }

  return (
    <>
      <h3>Chants</h3>
      <div className="edge-grid">
        {EDGE_NAMES.map((edge) => {
          const count = pieces.filter((piece) => piece.edges?.includes(edge)).length
          return (
            <div key={edge} className="edge-field">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={count === pieces.length}
                  ref={(input) => {
                    if (input) input.indeterminate = count > 0 && count < pieces.length
                  }}
                  onChange={(event) => {
                    const result = setEdgeOfSelection(edge, event.target.checked)
                    setError(result.ok ? null : result.error.message)
                  }}
                />
                {EDGE_LABELS[edge]}
              </label>
              {kind(edge) && <span className="edge-kind">{kind(edge)}</span>}
            </div>
          )
        })}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
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

      <div className="button-row shape-action">
        <button type="button" className="secondary" onClick={openShapeEditor}>
          Modifier la forme
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

      {selected.length > 0 && <EdgeFields pieces={selected} />}

      {only && <SinglePieceFields key={only.id} piece={only} />}
    </section>
  )
}
