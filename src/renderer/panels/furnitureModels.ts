import { validateCaissonParams } from '../../core/caisson'
import { DEFAULT_DRAWER_PARAMS, validateDrawerParams } from '../../core/drawers'
import type { CaissonParams, DrawerParams } from '../../core/model'
import { err, ok, type Result } from '../../core/result'
import type { TemplateChoice, TemplateKind } from '../../core/templates'
import { formatMm, parseMm } from '../../core/units'

/** Ce que le formulaire de meuble sait de chaque modèle : ses champs, ses valeurs de départ et sa validation. */

export interface FieldSpec {
  field: string
  label: string
  /** Un nombre entier, avec le message si la saisie n'en est pas un ; sinon une cote en millimètres. */
  integer?: string
  /** Rangé dans la section repliée des réglages. */
  advanced?: boolean
}

export type Drafts = Record<string, string>
type Params = Record<string, number> & { frontEdges?: true }

export interface ModelForm {
  fields: readonly FieldSpec[]
  defaults: Drafts
  /** Titre de la section repliée, s'il y en a une. */
  advancedTitle?: string
  createLabel: string
  customizedNote: string
  /** Confirmation quand on change les dimensions d'un meuble retouché. */
  changeMessage: string
  /** Confirmation quand on crée ce modèle par-dessus des pièces sans modèle. */
  createMessage: string
  /** Confirmation quand on crée ce modèle à la place de l'autre. */
  replaceMessage: string
  validate(params: Params): Result<Params>
}

const CAISSON_FIELDS: readonly FieldSpec[] = [
  { field: 'width', label: 'Largeur' },
  { field: 'height', label: 'Hauteur' },
  { field: 'depth', label: 'Profondeur' },
  { field: 'boardThickness', label: 'Épaisseur du bois' },
  { field: 'backThickness', label: 'Épaisseur du fond' },
  { field: 'shelfCount', label: "Nombre d'étagères", integer: "Le nombre d'étagères doit être un entier." }
]

const DRAWER_FIELDS: readonly FieldSpec[] = [
  { field: 'width', label: 'Largeur' },
  { field: 'height', label: 'Hauteur' },
  { field: 'depth', label: 'Profondeur' },
  { field: 'boardThickness', label: 'Épaisseur du bois' },
  { field: 'backThickness', label: 'Épaisseur du fond' },
  { field: 'drawerCount', label: 'Nombre de tiroirs', integer: 'Le nombre de tiroirs doit être un entier.' },
  { field: 'frontGap', label: 'Jeu entre façades', advanced: true },
  { field: 'slideGap', label: 'Jeu des coulisses', advanced: true },
  { field: 'drawerThickness', label: 'Épaisseur du bois des tiroirs', advanced: true },
  { field: 'drawerBottomThickness', label: 'Épaisseur du fond des tiroirs', advanced: true }
]

export function toDrafts(fields: readonly FieldSpec[], params: Params): Drafts {
  return Object.fromEntries(fields.map(({ field, integer }) => [field, integer ? String(params[field]) : formatMm(params[field]!)]))
}

export function parseDrafts(fields: readonly FieldSpec[], drafts: Drafts): Result<Params> {
  const params: Params = {}
  for (const { field, integer } of fields) {
    const text = drafts[field] ?? ''
    if (integer) {
      if (!/^-?\d+$/.test(text.trim())) return err('invalid-number', integer, field)
      params[field] = Number(text.trim())
    } else {
      const parsed = parseMm(text)
      if (!parsed.ok) return err(parsed.error.code, parsed.error.message, field)
      params[field] = parsed.value
    }
  }
  return ok(params)
}

export function sameParams(fields: readonly FieldSpec[], a: Params, b: Params): boolean {
  return fields.every(({ field }) => a[field] === b[field]) && Boolean(a.frontEdges) === Boolean(b.frontEdges)
}

// Les paramètres passent par une forme commune : chaque modèle les rend à sa propre validation.
export const MODELS: Record<TemplateKind, ModelForm> = {
  caisson: {
    fields: CAISSON_FIELDS,
    defaults: { width: '800', height: '1800', depth: '400', boardThickness: '18', backThickness: '5', shelfCount: '0' },
    createLabel: 'Créer le caisson',
    customizedNote: 'Ce caisson a été ajusté à la main.',
    changeMessage: 'Changer les dimensions du caisson remplacera les ajustements faits à la main.',
    createMessage: 'Créer un caisson remplacera les pièces déjà dessinées.',
    replaceMessage: 'Créer un caisson remplacera le meuble à tiroirs.',
    validate: (params) => validateCaissonParams(params as unknown as CaissonParams) as unknown as Result<Params>
  },
  drawers: {
    fields: DRAWER_FIELDS,
    defaults: toDrafts(DRAWER_FIELDS, DEFAULT_DRAWER_PARAMS as unknown as Params),
    advancedTitle: 'Réglages des tiroirs',
    createLabel: 'Créer le meuble à tiroirs',
    customizedNote: 'Ce meuble a été ajusté à la main.',
    changeMessage: 'Changer les dimensions du meuble remplacera les ajustements faits à la main.',
    createMessage: 'Créer un meuble à tiroirs remplacera les pièces déjà dessinées.',
    replaceMessage: 'Créer un meuble à tiroirs remplacera le caisson.',
    validate: (params) => validateDrawerParams(params as unknown as DrawerParams) as unknown as Result<Params>
  }
}

export function toChoice(kind: TemplateKind, params: Params): TemplateChoice {
  return kind === 'caisson'
    ? { kind, params: params as unknown as CaissonParams }
    : { kind, params: params as unknown as DrawerParams }
}

export type { Params as ModelParams }
