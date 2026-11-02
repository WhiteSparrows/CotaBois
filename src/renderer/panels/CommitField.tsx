import { useEffect, useId, useState } from 'react'
import type { CoreError } from '../../core/result'

interface CommitFieldProps {
  label: string
  value: string
  unit?: string
  /** Applique la saisie ; renvoie l'erreur à afficher si elle est refusée. */
  onCommit(text: string): CoreError | null
}

/** Un champ qui s'applique à la sortie ou avec Entrée, et garde la saisie refusée pour la corriger. */
export function CommitField({ label, value, unit, onCommit }: CommitFieldProps) {
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
