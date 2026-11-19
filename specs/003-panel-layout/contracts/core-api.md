# Contrat : API du cœur pour le calepinage

Mêmes conventions que les contrats précédents : fonctions pures, résultat `{ ok, value }` ou `{ ok, error }`, messages en français, aucune dépendance à l'interface.

## Placement (`src/core/guillotine.ts`)

| Fonction | Rôle |
|---|---|
| `packPanels(items, panel, options)` | Place des rectangles dans des panneaux identiques. `items` : `{ sizeX, sizeY }`, chaque placement renvoyant la position de la pièce dans cette liste ; `panel` : `{ sizeX, sizeY }` ; `options` : `{ kerf, rotate, runs }`. Renvoie les panneaux, chacun avec ses placements, ses chutes et ses coupes dans l'ordre, et les index non placés. Ne lève jamais d'exception. |

Le résultat ne dépend que des arguments. La marge de bord n'est pas connue de cette fonction : `panel` est la surface utile.

## Réglages (`src/core/layout.ts`)

Toutes renvoient un nouveau projet, sans marquer le caisson comme retouché.

| Fonction | Rôle |
|---|---|
| `defaultLayoutSettings()` | Réglages d'un projet neuf. |
| `setLayoutOptions(project, { kerf?, edgeMargin? })` | Change le trait de scie ou la marge. Refuse une valeur hors limites, ou une marge qui ne laisse pas de surface utile, en nommant le panneau en cause. |
| `setPanelStock(project, material, thickness, { length?, width?, grain? })` | Crée ou modifie le panneau d'un groupe. |
| `validateLayoutSettings(settings)` | Applique les règles de `data-model.md`, pour la lecture d'un fichier. |

## Résultat

| Fonction | Rôle |
|---|---|
| `computeLayout(project)` | Calcule le `Layout` décrit dans `data-model.md`. Sans pièce : `{ groups: [], complete: true }`. Ne lève jamais d'exception, et ne modifie pas le projet. |
| `formatUsage(usedArea, panelArea)` | Taux d'utilisation arrondi à la décimale inférieure, par exemple `100 %` ou `87,3 %`. |

## Existant

| Fonction | Évolution |
|---|---|
| `materialKey(material)` | Exportée par `cutList.ts`. |
| `createEmptyProject()` | Ajoute les réglages par défaut. |
| `parseProject`, `serializeProject` | Version 3 et migration, voir [project-file-v3.md](project-file-v3.md). |
| `computeCutList`, `toCsv` | Inchangées. |
