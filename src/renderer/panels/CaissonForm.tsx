import { useEffect, useState, type FormEvent } from 'react'
import { validateCaissonParams } from '../../core/caisson'
import type { CaissonParams } from '../../core/model'
import { err, ok, type CoreError, type Result } from '../../core/result'
import { formatMm, parseMm } from '../../core/units'
import { applyCaissonParams, useEditor } from '../store'
import { ConfirmDialog } from './ConfirmDialog'

type Field = keyof CaissonParams
type Drafts = Record<Field, string>

const FIELDS: ReadonlyArray<{ field: Field; label: string; unit?: string }> = [
  { field: 'width', label: 'Largeur', unit: 'mm' },
  { field: 'height', label: 'Hauteur', unit: 'mm' },
  { field: 'depth', label: 'Profondeur', unit: 'mm' },
  { field: 'boardThickness', label: 'Épaisseur du bois', unit: 'mm' },
  { field: 'backThickness', label: 'Épaisseur du fond', unit: 'mm' },
  { field: 'shelfCount', label: "Nombre d'étagères" }
]

const DEFAULT_DRAFTS: Drafts = {
  width: '800',
  height: '1800',
  depth: '400',
  boardThickness: '18',
  backThickness: '5',
  shelfCount: '0'
}

function toDrafts(params: CaissonParams): Drafts {
  return {
    width: formatMm(params.width),
    height: formatMm(params.height),
    depth: formatMm(params.depth),
    boardThickness: formatMm(params.boardThickness),
    backThickness: formatMm(params.backThickness),
    shelfCount: String(params.shelfCount)
  }
}

function parseDrafts(drafts: Drafts): Result<CaissonParams> {
  const params = {} as CaissonParams
  for (const { field } of FIELDS) {
    if (field === 'shelfCount') {
      const text = drafts.shelfCount.trim()
      if (!/^-?\d+$/.test(text)) {
        return err('invalid-number', "Le nombre d'étagères doit être un entier.", field)
      }
      params.shelfCount = Number(text)
    } else {
      const parsed = parseMm(drafts[field])
      if (!parsed.ok) return err(parsed.error.code, parsed.error.message, field)
      params[field] = parsed.value
    }
  }
  return ok(params)
}

function sameParams(a: CaissonParams, b: CaissonParams): boolean {
  return FIELDS.every(({ field }) => a[field] === b[field])
}

export function CaissonForm() {
  const { project } = useEditor()
  const template = project.template
  const [drafts, setDrafts] = useState<Drafts>(() => (template ? toDrafts(template.params) : DEFAULT_DRAFTS))
  const [error, setError] = useState<CoreError | null>(null)
  const [pendingParams, setPendingParams] = useState<CaissonParams | null>(null)

  useEffect(() => {
    if (template) {
      setDrafts(toDrafts(template.params))
      setError(null)
    }
  }, [template?.params])

  // Générer un caisson remplace toutes les pièces : on ne perd pas un travail manuel sans prévenir.
  const wouldLoseWork = template ? template.customized : project.pieces.length > 0

  function commit(): void {
    if (pendingParams) return
    const parsed = parseDrafts(drafts)
    const validated = parsed.ok ? validateCaissonParams(parsed.value) : parsed
    if (!validated.ok) {
      setError(validated.error)
      return
    }
    setError(null)
    if (template && sameParams(template.params, validated.value)) return
    if (wouldLoseWork) {
      setPendingParams(validated.value)
    } else {
      applyCaissonParams(validated.value)
    }
  }

  function submit(event: FormEvent): void {
    event.preventDefault()
    commit()
  }

  function confirmReplace(): void {
    if (pendingParams) applyCaissonParams(pendingParams)
    setPendingParams(null)
  }

  function keepWork(): void {
    setPendingParams(null)
    setDrafts(template ? toDrafts(template.params) : DEFAULT_DRAFTS)
  }

  return (
    <form className="panel caisson-form" onSubmit={submit} noValidate>
      <h2>Caisson</h2>
      {template?.customized && (
        <p className="panel-note">Ce caisson a été ajusté à la main.</p>
      )}
      {FIELDS.map(({ field, label, unit }) => (
        <div className="field" key={field}>
          <label htmlFor={`caisson-${field}`}>{label}</label>
          <div className="field-input">
            <input
              id={`caisson-${field}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={drafts[field]}
              aria-invalid={error?.field === field}
              aria-describedby={error?.field === field ? 'caisson-error' : undefined}
              onChange={(event) => setDrafts({ ...drafts, [field]: event.target.value })}
              onBlur={template ? commit : undefined}
            />
            {unit && <span className="unit">{unit}</span>}
          </div>
          {error?.field === field && (
            <p id="caisson-error" className="field-error" role="alert">
              {error.message}
            </p>
          )}
        </div>
      ))}
      {template ? (
        <button type="submit" className="visually-hidden" tabIndex={-1}>
          Appliquer
        </button>
      ) : (
        <button type="submit" className="primary">
          Créer le caisson
        </button>
      )}
      {pendingParams && (
        <ConfirmDialog
          title="Remplacer les pièces ?"
          message={
            template
              ? 'Changer les dimensions du caisson remplacera les ajustements faits à la main.'
              : 'Créer un caisson remplacera les pièces déjà dessinées.'
          }
          confirmLabel="Remplacer"
          cancelLabel="Garder mes ajustements"
          onConfirm={confirmReplace}
          onCancel={keepWork}
        />
      )}
    </form>
  )
}
