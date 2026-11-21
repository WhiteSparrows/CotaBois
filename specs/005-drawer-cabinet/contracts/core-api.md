# Contrat : API du cœur pour le meuble à tiroirs

Mêmes conventions que les contrats précédents : fonctions pures, résultat `{ ok, value }` ou `{ ok, error }`, messages en français, aucune dépendance à l'interface.

## Meuble à tiroirs (`src/core/drawers.ts`)

| Fonction | Rôle |
|---|---|
| `DEFAULT_DRAWER_PARAMS` | Les valeurs par défaut de `data-model.md`. |
| `validateDrawerParams(params)` | Applique les refus de `research.md`, R7, avec `field` sur le champ en cause. |
| `maxDrawerCount(params)` | Le plus grand nombre de tiroirs possible pour ces dimensions, pour le message de refus. |
| `drawerLayout(params)` | Les cotes calculées : façades, boîte, profondeur, pour les tests et les messages. |
| `applyDrawerCabinet(project, params, nextId)` | Remplace les pièces par le meuble généré, avec `template` de type `drawers`, `customized: false`. |

## Modèles (`src/core/templates.ts`)

| Fonction | Rôle |
|---|---|
| `applyTemplate(project, choice, nextId)` | `choice` : `{ kind: 'caisson', params }` ou `{ kind: 'drawers', params }`. Aiguille vers la bonne génération. |
| `TEMPLATE_LABELS` | `Caisson`, `Meuble à tiroirs`. |

## Existant

| Fonction | Évolution |
|---|---|
| `carcassPieces(params, nextId)` | Exportée par `caisson.ts` : la carcasse sans étagère, réutilisée par le meuble à tiroirs. |
| `applyCaisson` | Inchangée. |
| `parseProject`, `serializeProject` | Version 5, voir [project-file-v5.md](project-file-v5.md). |
