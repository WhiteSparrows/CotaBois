export interface CoreError {
  code: string
  /** Message en français, prêt à afficher. */
  message: string
  field?: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: CoreError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T = never>(code: string, message: string, field?: string): Result<T> {
  const error: CoreError = field === undefined ? { code, message } : { code, message, field }
  return { ok: false, error }
}
