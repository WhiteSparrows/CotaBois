# Contrat : API du cœur pour les formes

Mêmes conventions que `specs/001-furniture-cut-list/contracts/core-api.md` : fonctions pures, résultat `{ ok, value }` ou `{ ok, error }`, messages en français, aucune dépendance à l'interface.

## Lecture d'une forme (`src/core/shape.ts`)

| Fonction | Rôle |
|---|---|
| `validateShape(shape)` | Applique les règles de `data-model.md`. Ne lève jamais d'exception. |
| `normalizeShape(shape)` | Renvoie un rectangle s'il ne reste ni coin modifié ni découpe. |
| `maxCornerSize(shape, corner)` | Valeur maximale possible pour ce coin, avec les autres coins et les découpes actuels. |
| `resolveCutout(shape, cutout)` | Boîte absolue de la découpe dans le repère de la pièce. |
| `shapeContains(shape, u, v)` | Vrai si le point est dans la matière. |
| `shapeOutline(shape)` | Contour et trous, en segments et arcs exacts, pour l'affichage et les plans. |
| `canonicalShapeKey(shape)` | Clé identique pour deux formes égales à une rotation ou un retournement près. Vide pour un rectangle. |

## Modification (`src/core/pieces.ts`)

Toutes renvoient un nouveau projet, marquent le caisson comme retouché, et sont atomiques : si une pièce refuse, aucune n'est modifiée, et le message nomme la pièce.

| Fonction | Rôle |
|---|---|
| `setCorner(project, pieceIds, corner, treatment)` | Change un coin. |
| `addCutout(project, pieceIds, input, nextId)` | Ajoute une découpe. |
| `updateCutout(project, pieceId, cutoutId, changes)` | Change les cotes ou la position d'une découpe. |
| `removeCutout(project, pieceId, cutoutId)` | Retire une découpe. |

`updatePiece` revalide la forme lorsque `length` ou `width` change, selon FR-013.

## Géométrie et liste

| Fonction | Évolution |
|---|---|
| `findOverlaps(project)` | Tient compte de la forme réelle, selon `research.md`, R5. Résultat inchangé pour des rectangles. |
| `computeCutList(project)` | Regroupe selon `canonicalShapeKey` et numérote les plans. |
| `toCsv(cutList)` | Ajoute la colonne `Plan` uniquement si au moins une ligne a une forme. |
| `describeShape(shape)` | Lignes de texte du tableau du plan, numérotées, avec les noms des bords. |
| `parseProject`, `serializeProject` | Version 2 et migration, voir [project-file-v2.md](project-file-v2.md). |
