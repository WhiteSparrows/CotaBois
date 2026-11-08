import { useId, useState } from 'react'
import type { CornerName, CornerTreatment, Cutout, Piece, ShapedShape } from '../../core/model'
import type { CutoutChanges } from '../../core/pieces'
import type { CoreError, Result } from '../../core/result'
import {
  asShaped,
  CORNER_LABELS,
  CORNER_NAMES,
  cornerSize,
  maxCornerSize,
  resolveCutout,
  touchesBoundary,
  type CutoutPreset
} from '../../core/shape'
import { formatMm, parseMm } from '../../core/units'
import {
  addCutoutToPiece,
  closeShapeEditor,
  removeCutoutOfPiece,
  setCornerOfSelection,
  setCutoutReference,
  updateCutoutOfPiece,
  useEditor
} from '../store'
import { CommitField } from './CommitField'
import { ShapePreview } from './ShapePreview'

/** Taille proposée à un coin qui vient de changer de type : 20 mm, si la place le permet. */
const DEFAULT_CORNER_SIZE = 200

const CAPITALIZED_CORNERS: Record<CornerName, string> = {
  bottomLeft: 'Bas gauche',
  bottomRight: 'Bas droit',
  topRight: 'Haut droit',
  topLeft: 'Haut gauche'
}

function failure(result: Result<unknown>): CoreError | null {
  return result.ok ? null : result.error
}

function treatmentOf(kind: string, size: number): CornerTreatment {
  if (kind === 'round') return { kind: 'round', radius: size }
  if (kind === 'chamfer') return { kind: 'chamfer', size }
  return { kind: 'straight' }
}

function cutoutTitle(shape: ShapedShape, cutout: Cutout): string {
  if (cutout.kind === 'circle') return 'trou rond'
  return touchesBoundary(shape, resolveCutout(shape, cutout)) ? 'encoche' : 'trou rectangulaire'
}

interface CornerRowProps {
  shape: ShapedShape
  corner: CornerName
  onError(message: string | null): void
}

function CornerRow({ shape, corner, onError }: CornerRowProps) {
  const treatment = shape.corners[corner]
  const label = CORNER_LABELS[corner]

  function changeKind(kind: string): void {
    const size = cornerSize(treatment) || Math.min(DEFAULT_CORNER_SIZE, maxCornerSize(shape, corner))
    if (kind !== 'straight' && size === 0) {
      onError(`Il n'y a pas de place pour modifier le coin ${label}.`)
      return
    }
    const result = setCornerOfSelection(corner, treatmentOf(kind, size))
    onError(result.ok ? null : result.error.message)
  }

  function commitSize(text: string): CoreError | null {
    const parsed = parseMm(text)
    return parsed.ok ? failure(setCornerOfSelection(corner, treatmentOf(treatment.kind, parsed.value))) : parsed.error
  }

  const fieldLabel = `${treatment.kind === 'round' ? 'Rayon' : 'Chanfrein'} ${label}`

  return (
    <div className="corner-row">
      <label className="corner-name">
        {CAPITALIZED_CORNERS[corner]}
        <select
          aria-label={`Type du coin ${label}`}
          value={treatment.kind}
          onChange={(event) => changeKind(event.target.value)}
        >
          <option value="straight">Droit</option>
          <option value="round">Arrondi</option>
          <option value="chamfer">Chanfrein</option>
        </select>
      </label>
      {treatment.kind !== 'straight' && (
        <CommitField label={fieldLabel} unit="mm" value={formatMm(cornerSize(treatment))} onCommit={commitSize} />
      )}
    </div>
  )
}

interface CutoutFieldsProps {
  piece: Piece
  shape: ShapedShape
  cutout: Cutout
  index: number
  selected: boolean
  onSelect(): void
}

function CutoutFields({ piece, shape, cutout, index, selected, onSelect }: CutoutFieldsProps) {
  const idPrefix = useId()
  const [referenceError, setReferenceError] = useState<string | null>(null)

  function commit(change: (value: number) => CutoutChanges) {
    return (text: string): CoreError | null => {
      const parsed = parseMm(text)
      return parsed.ok ? failure(updateCutoutOfPiece(piece.id, cutout.id, change(parsed.value))) : parsed.error
    }
  }

  function changeReference(axis: 'u' | 'v', edge: string): void {
    const result = setCutoutReference(piece.id, cutout, axis, edge)
    setReferenceError(result.ok ? null : result.error.message)
  }

  return (
    <fieldset className={`cutout-card${selected ? ' selected' : ''}`} onFocus={onSelect}>
      <legend>
        Découpe {index + 1} : {cutoutTitle(shape, cutout)}
      </legend>

      {cutout.kind === 'circle' ? (
        <CommitField label="Diamètre" unit="mm" value={formatMm(cutout.diameter)} onCommit={commit((diameter) => ({ diameter }))} />
      ) : (
        <>
          <CommitField label="Longueur" unit="mm" value={formatMm(cutout.sizeU)} onCommit={commit((sizeU) => ({ sizeU }))} />
          <CommitField label="Largeur" unit="mm" value={formatMm(cutout.sizeV)} onCommit={commit((sizeV) => ({ sizeV }))} />
          <CommitField
            label="Rayon d'angle"
            unit="mm"
            value={formatMm(cutout.cornerRadius)}
            onCommit={commit((cornerRadius) => ({ cornerRadius }))}
          />
        </>
      )}

      <div className="select-field">
        <label htmlFor={`${idPrefix}-u`}>Référence horizontale</label>
        <select id={`${idPrefix}-u`} value={cutout.fromU.edge} onChange={(event) => changeReference('u', event.target.value)}>
          <option value="left">Bord gauche</option>
          <option value="right">Bord droit</option>
        </select>
      </div>
      <CommitField
        label="Distance horizontale"
        unit="mm"
        value={formatMm(cutout.fromU.distance)}
        onCommit={commit((distance) => ({ fromU: { edge: cutout.fromU.edge, distance } }))}
      />
      <div className="select-field">
        <label htmlFor={`${idPrefix}-v`}>Référence verticale</label>
        <select id={`${idPrefix}-v`} value={cutout.fromV.edge} onChange={(event) => changeReference('v', event.target.value)}>
          <option value="bottom">Bord bas</option>
          <option value="top">Bord haut</option>
        </select>
      </div>
      <CommitField
        label="Distance verticale"
        unit="mm"
        value={formatMm(cutout.fromV.distance)}
        onCommit={commit((distance) => ({ fromV: { edge: cutout.fromV.edge, distance } }))}
      />

      {referenceError && (
        <p className="field-error" role="alert">
          {referenceError}
        </p>
      )}
      <button type="button" className="secondary danger" onClick={() => removeCutoutOfPiece(piece.id, cutout.id)}>
        Supprimer
      </button>
    </fieldset>
  )
}

export function ShapeEditor() {
  const { project, selection } = useEditor()
  const [selectedCutoutId, setSelectedCutoutId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const piece = project.pieces.find((candidate) => candidate.id === selection[0])
  if (!piece) return null
  const shape = asShaped(piece.shape)

  function addCutout(preset: CutoutPreset): void {
    const result = addCutoutToPiece(piece!.id, preset)
    setError(result.ok ? null : result.error.message)
  }

  function commitCorner(corner: CornerName, treatment: CornerTreatment): void {
    const result = setCornerOfSelection(corner, treatment)
    setError(result.ok ? null : result.error.message)
  }

  function commitCutout(cutoutId: string, changes: CutoutChanges): void {
    const result = updateCutoutOfPiece(piece!.id, cutoutId, changes)
    setError(result.ok ? null : result.error.message)
  }

  return (
    <section className="panel shape-editor" aria-label="Forme de la pièce">
      <div className="panel-heading">
        <h2>Forme : {piece.name}</h2>
        <button type="button" className="secondary" onClick={closeShapeEditor}>
          Terminer
        </button>
      </div>

      <ShapePreview
        shape={shape}
        selectedCutoutId={selectedCutoutId}
        onSelectCutout={setSelectedCutoutId}
        onCornerCommit={commitCorner}
        onCutoutCommit={commitCutout}
      />

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <h3>Coins</h3>
      <div className="corner-grid">
        {CORNER_NAMES.map((corner) => (
          <CornerRow key={corner} shape={shape} corner={corner} onError={setError} />
        ))}
      </div>

      <h3>Découpes</h3>
      <div className="button-row panel-actions">
        <button type="button" className="secondary" onClick={() => addCutout('notch')}>
          Encoche
        </button>
        <button type="button" className="secondary" onClick={() => addCutout('rectangle')}>
          Trou rectangulaire
        </button>
        <button type="button" className="secondary" onClick={() => addCutout('circle')}>
          Trou rond
        </button>
      </div>

      {shape.cutouts.map((cutout, index) => (
        <CutoutFields
          key={cutout.id}
          piece={piece}
          shape={shape}
          cutout={cutout}
          index={index}
          selected={cutout.id === selectedCutoutId}
          onSelect={() => setSelectedCutoutId(cutout.id)}
        />
      ))}
    </section>
  )
}
