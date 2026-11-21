import { useEffect, useState, type FormEvent } from 'react'
import type { Template } from '../../core/model'
import { ok, type CoreError, type Result } from '../../core/result'
import { TEMPLATE_LABELS, type TemplateKind } from '../../core/templates'
import { applyTemplateParams, useEditor } from '../store'
import { ConfirmDialog } from './ConfirmDialog'
import { MODELS, parseDrafts, sameParams, toChoice, toDrafts, type Drafts, type FieldSpec, type ModelParams } from './furnitureModels'

const KINDS: readonly TemplateKind[] = ['caisson', 'drawers']

function draftsFor(kind: TemplateKind, template: Template | null): Drafts {
  const model = MODELS[kind]
  return template?.kind === kind ? toDrafts(model.fields, template.params as unknown as ModelParams) : model.defaults
}

function withOption(params: Result<ModelParams>, frontEdges: boolean): Result<ModelParams> {
  return params.ok && frontEdges ? ok({ ...params.value, frontEdges: true } as ModelParams) : params
}

/** Le formulaire du panneau de gauche quand rien n'est sélectionné : choisir un modèle, puis le créer ou l'ajuster. */
export function FurnitureForm() {
  const { project } = useEditor()
  const template = project.template
  const [kind, setKind] = useState<TemplateKind>(template?.kind ?? 'caisson')
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFor(kind, template))
  const [frontEdges, setFrontEdges] = useState(Boolean(template?.params.frontEdges))
  const [error, setError] = useState<CoreError | null>(null)
  const [pending, setPending] = useState<ModelParams | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Un autre projet, une annulation ou une régénération : le formulaire suit le meuble du projet.
  useEffect(() => {
    const nextKind = template?.kind ?? 'caisson'
    setKind(nextKind)
    setDrafts(draftsFor(nextKind, template))
    setFrontEdges(Boolean(template?.params.frontEdges))
    setError(null)
    // `customized` seul ne change pas les réglages : les brouillons restent.
  }, [template?.kind, template?.params])

  const model = MODELS[kind]
  // Le meuble affiché est celui du projet : chaque champ s'applique dès qu'on le quitte.
  const current = template?.kind === kind ? template : null
  // Générer un meuble remplace toutes les pièces : on ne perd pas un travail sans prévenir.
  const wouldLoseWork = current ? current.customized : project.pieces.length > 0

  function chooseKind(next: TemplateKind): void {
    setKind(next)
    setDrafts(draftsFor(next, template))
    setFrontEdges(template?.kind === next ? Boolean(template.params.frontEdges) : frontEdges)
    setError(null)
  }

  function commit(withFrontEdges = frontEdges): void {
    if (pending) return
    const parsed = withOption(parseDrafts(model.fields, drafts), withFrontEdges)
    const validated = parsed.ok ? model.validate(parsed.value) : parsed
    if (!validated.ok) {
      setError(validated.error)
      if (model.fields.some((spec) => spec.advanced && spec.field === validated.error.field)) setAdvancedOpen(true)
      return
    }
    setError(null)
    if (current && sameParams(model.fields, current.params as unknown as ModelParams, validated.value)) return
    if (wouldLoseWork) {
      setPending(validated.value)
    } else {
      applyTemplateParams(toChoice(kind, validated.value))
    }
  }

  function submit(event: FormEvent): void {
    event.preventDefault()
    commit()
  }

  function toggleFrontEdges(checked: boolean): void {
    setFrontEdges(checked)
    // Un meuble déjà créé est régénéré aussitôt ; sinon, l'option attend le bouton de création.
    if (current) commit(checked)
  }

  function confirmReplace(): void {
    if (pending) applyTemplateParams(toChoice(kind, pending))
    setPending(null)
  }

  function keepWork(): void {
    setPending(null)
    setDrafts(draftsFor(kind, template))
    setFrontEdges(current ? Boolean(current.params.frontEdges) : frontEdges)
  }

  function confirmMessage(): string {
    if (current) return model.changeMessage
    return template ? model.replaceMessage : model.createMessage
  }

  function renderField({ field, label, integer }: FieldSpec) {
    const id = `furniture-${field}`
    return (
      <div className="field" key={field}>
        <label htmlFor={id}>{label}</label>
        <div className="field-input">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={drafts[field] ?? ''}
            aria-invalid={error?.field === field}
            aria-describedby={error?.field === field ? 'furniture-error' : undefined}
            onChange={(event) => setDrafts({ ...drafts, [field]: event.target.value })}
            onBlur={current ? () => commit() : undefined}
          />
          {!integer && <span className="unit">mm</span>}
        </div>
        {error?.field === field && (
          <p id="furniture-error" className="field-error" role="alert">
            {error.message}
          </p>
        )}
      </div>
    )
  }

  const basicFields = model.fields.filter((spec) => !spec.advanced)
  const advancedFields = model.fields.filter((spec) => spec.advanced)

  return (
    <form className="panel caisson-form" onSubmit={submit} noValidate>
      <h2>Meuble</h2>
      <div className="select-field">
        <label htmlFor="furniture-kind">Modèle</label>
        <select id="furniture-kind" value={kind} onChange={(event) => chooseKind(event.target.value as TemplateKind)}>
          {KINDS.map((option) => (
            <option key={option} value={option}>
              {TEMPLATE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      {current?.customized && <p className="panel-note">{model.customizedNote}</p>}
      {basicFields.map(renderField)}
      {advancedFields.length > 0 && (
        <details
          className="advanced-fields"
          open={advancedOpen}
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary>{model.advancedTitle}</summary>
          {advancedFields.map(renderField)}
        </details>
      )}
      <label className="check-field">
        <input type="checkbox" checked={frontEdges} onChange={(event) => toggleFrontEdges(event.target.checked)} />
        Chants sur les bords avant
      </label>
      {current ? (
        <button type="submit" className="visually-hidden" tabIndex={-1}>
          Appliquer
        </button>
      ) : (
        <button type="submit" className="primary">
          {model.createLabel}
        </button>
      )}
      {pending && (
        <ConfirmDialog
          title="Remplacer les pièces ?"
          message={confirmMessage()}
          confirmLabel="Remplacer"
          cancelLabel="Garder mes ajustements"
          onConfirm={confirmReplace}
          onCancel={keepWork}
        />
      )}
    </form>
  )
}
