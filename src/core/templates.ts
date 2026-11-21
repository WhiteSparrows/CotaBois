import { applyCaisson } from './caisson'
import { applyDrawerCabinet } from './drawers'
import type { CaissonParams, DrawerParams, Project, Template } from './model'
import type { Result } from './result'

/** Le seul endroit qui connaît tous les modèles de meuble. */

export type TemplateChoice = { kind: 'caisson'; params: CaissonParams } | { kind: 'drawers'; params: DrawerParams }

export type TemplateKind = Template['kind']

export const TEMPLATE_LABELS: Record<TemplateKind, string> = {
  caisson: 'Caisson',
  drawers: 'Meuble à tiroirs'
}

export function applyTemplate(project: Project, choice: TemplateChoice, nextId: () => string): Result<Project> {
  return choice.kind === 'caisson'
    ? applyCaisson(project, choice.params, nextId)
    : applyDrawerCabinet(project, choice.params, nextId)
}
