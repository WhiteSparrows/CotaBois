# Contrat : API du cœur métier

Le cœur (`src/core`) n'importe ni Electron, ni Three.js, ni React, et n'accède ni au disque ni au réseau (principe V). Ses fonctions sont pures, hormis la génération d'identifiants, qui est fournie en paramètre pour rester déterministe dans les tests.

Une opération qui peut échouer renvoie `{ ok: true, value }` ou `{ ok: false, error: { code, message, field? } }`. Le `message` est en français, prêt à afficher. Le cœur ne lève pas d'exception pour une entrée utilisateur invalide.

## Saisie et affichage des cotes

| Fonction | Rôle |
|---|---|
| `parseMm(text)` | `"18,5"` ou `"18.5"` → `185`. Refuse le vide, le non numérique et plus d'une décimale. Ne vérifie pas les limites. |
| `formatMm(tenths)` | `185` → `"18,5"`, `180` → `"18"`. |
| `formatSquareMeters(area)` | Surface → texte en m² à deux décimales, avec virgule. |

Pour tout `t` entier valide, `parseMm(formatMm(t))` redonne `t`.

## Projet et caisson

| Fonction | Rôle |
|---|---|
| `createEmptyProject()` | Projet vide (FR-005). |
| `validateCaissonParams(params)` | Applique les contraintes du modèle de données. |
| `applyCaisson(project, params, ids)` | Régénère les pièces et le modèle, avec `customized = false`. L'interface vérifie d'abord `customized` et demande confirmation (FR-016). |

## Modification des pièces

Chaque fonction renvoie un résultat contenant un nouveau projet et passe `template.customized` à `true`.

| Fonction | Rôle |
|---|---|
| `addPiece(project, input, id)` | Ajoute un panneau. |
| `duplicatePiece(project, pieceId, id)` | Copie la pièce et la place juste à côté de l'original, sans chevauchement. |
| `removePieces(project, pieceIds)` | Retire des pièces. |
| `updatePiece(project, pieceId, changes)` | Change le nom, les cotes, le matériau ou la position, après validation. |
| `rotatePiece(project, pieceId, axis)` | Quart de tour autour de `x`, `y` ou `z`. Garde le centre de la pièce, au dixième près. Cotes de découpe inchangées. |

`renameProject(project, name)` existe aussi, mais ne touche pas à `customized`.

## Géométrie

| Fonction | Rôle |
|---|---|
| `pieceBounds(piece)` | Boîte englobante dans le repère du meuble. |
| `projectBounds(project)` | Dimensions d'ensemble (FR-013), ou `null` sans pièce. |
| `findOverlaps(project)` | Paires de pièces dont les volumes s'interpénètrent. Le contact bord à bord n'en fait pas partie. |
| `snapPosition(project, pieceId, position, threshold)` | Position alignée sur les faces voisines, avec le seuil de 5 mm par défaut. |

## Liste de découpe et exports

| Fonction | Rôle |
|---|---|
| `computeCutList(project)` | Renvoie les `CutLine` et les `CutTotals`. Déterministe. |
| `toCsv(cutList)` | Texte du CSV, voir [exports.md](exports.md). |
| `serializeProject(project)` | Texte du fichier, voir [project-file.md](project-file.md). |
| `parseProject(text)` | Projet ou erreur, avec migrations. |

## Historique

| Fonction | Rôle |
|---|---|
| `createHistory(project)`, `pushState(history, project)` | Initialise ou ajoute un état. Ajouter vide `redo`, et les états au-delà de 100 sont oubliés. |
| `undo(history)`, `redo(history)` | Déplacent l'état courant. Sans effet s'il n'y a rien à annuler ou à rétablir. |
