# Contrat : API du cœur pour les chants et le coût

Mêmes conventions que les contrats précédents : fonctions pures, résultat `{ ok, value }` ou `{ ok, error }`, messages en français, aucune dépendance à l'interface.

## Chants (`src/core/edges.ts`)

| Fonction | Rôle |
|---|---|
| `NO_EDGES` | Les quatre bords à faux. |
| `cutSize(piece, settings)` | Cote à couper, selon `data-model.md`. |
| `checkCutSizes(project, pieceIds?)` | Refuse, en nommant la pièce, toute cote à couper inférieure à 0,1 mm. |
| `edgeSummary(edges, length, width)` | `2 longs, 1 court`, `4 bords`, ou vide. |
| `edgeLength(piece, overhang)` | Somme des côtés finis chantés et des surlongueurs. |
| `setEdges(project, pieceIds, edge, banded)` | Pose ou retire un chant sur plusieurs pièces, en une action. Atomique : si une pièce refuse, aucune ne change, et le message la nomme. Marque le caisson comme retouché. |

## Coût (`src/core/cost.ts`)

| Fonction | Rôle |
|---|---|
| `computeCost(project, layout)` | Le `Cost` de `data-model.md`. Ne lève jamais d'exception. |

## Unités (`src/core/units.ts`)

| Fonction | Rôle |
|---|---|
| `parseEuros(text)` | Montant en centimes, ou refus expliqué. |
| `formatEuros(cents)` | `98,23 €`, avec une espace insécable avant le symbole et entre les milliers. |
| `formatMeters(tenths)` | Arrondi au centimètre supérieur : `7,56 m`. |

## Existant

| Fonction | Évolution |
|---|---|
| `canonicalShapeKey(shape)` | Remplacée par `canonicalPieceKey(shape, edges)`, vide pour un rectangle sans chant. |
| `updatePiece` | Vérifie aussi les cotes à couper après un changement de dimension, de matériau ou d'épaisseur. |
| `applyCaisson` | Applique `frontEdges`. |
| `setPanelStock` | Accepte `edgeThickness`, `panelPrice`, `edgePrice`, et vérifie les cotes à couper du groupe. |
| `setLayoutOptions` | Accepte `edgeOverhang`. |
| `computeCutList` | Cotes à couper, cotes finies, chants et métrages. |
| `toCsv` | Colonnes des chants, seulement s'il y en a. |
| `computeLayout` | Pièces placées à leur cote à couper. |
| `parseProject`, `serializeProject` | Version 4 et migration, voir [project-file-v4.md](project-file-v4.md). |
