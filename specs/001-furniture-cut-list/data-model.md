# Data Model: Conception de meubles et liste de découpe

## Conventions

- **Longueur** : entier en dixièmes de millimètre (`Tenths`). `18,5 mm` → `185`. Voir [research.md](research.md), R1.
- **Repère** : X pour la largeur du meuble, Y pour la hauteur (vers le haut), Z pour la profondeur, du dos vers l'avant. L'unité reste le dixième de millimètre.
- **Immuabilité** : `Project` et ses pièces ne sont jamais modifiés en place. Toute action renvoie un nouveau projet.

## Entités

### Project

| Champ | Type | Règles |
|---|---|---|
| `name` | texte | 1 à 120 caractères après suppression des espaces. Par défaut « Nouveau meuble ». |
| `pieces` | liste de `Piece` | Peut être vide. L'ordre est celui de création. Identifiants uniques. |
| `template` | `CaissonTemplate` ou `null` | `null` pour un projet parti de zéro. |

### CaissonTemplate

| Champ | Type | Règles |
|---|---|---|
| `kind` | `"caisson"` | Seule variante pour l'instant ; d'autres modèles s'ajouteront ici. |
| `params` | `CaissonParams` | Dernières valeurs valides saisies. |
| `customized` | booléen | Passe à `true` dès qu'une pièce est retouchée à la main (FR-016). Repasse à `false` à la régénération. |

### CaissonParams

| Champ | Type | Règles |
|---|---|---|
| `width`, `height`, `depth` | `Tenths` | 1 à 100 000. |
| `boardThickness` | `Tenths` | 1 à 100 000. |
| `backThickness` | `Tenths` | 0 (pas de fond) ou 1 à 100 000. |
| `shelfCount` | entier | 0 à 100. |

Contraintes entre champs, chacune refusée avec un message qui explique le problème :

- `width > 2 × boardThickness` et `height > 2 × boardThickness`.
- `depth > backThickness`.
- `shelfCount × boardThickness < height − 2 × boardThickness`. Le message indique le nombre maximal d'étagères possible, en tenant compte de la limite de 100.

### Piece

| Champ | Type | Règles |
|---|---|---|
| `id` | texte | Unique dans le projet, stable après enregistrement. |
| `name` | texte | 1 à 80 caractères après suppression des espaces. |
| `shape` | `Shape` | Voir ci-dessous. |
| `thickness` | `Tenths` | 1 à 100 000. |
| `material` | texte | 0 à 80 caractères, vide si non renseigné. |
| `position` | `{ x, y, z }` | Entiers de −1 000 000 à 1 000 000. Coin minimal de la boîte englobante. |
| `orientation` | `{ u, v }` | Axes signés (`"+x"`, `"-z"`, etc.) et perpendiculaires. `u` suit la longueur, `v` la largeur. |

### Shape

Une seule variante dans cette version : `{ kind: "rectangle", length: Tenths, width: Tenths }`, avec des valeurs de 1 à 100 000. `length` peut être inférieur à `width` sur une pièce : c'est la liste de découpe qui les remet dans l'ordre.

### CutLine (calculée, jamais enregistrée)

| Champ | Description |
|---|---|
| `quantity` | Nombre de pièces regroupées. |
| `pieceIds` | Identifiants des pièces, pour la sélection croisée avec la vue 3D (FR-008). |
| `names` | Noms des pièces, sans doublon, dans l'ordre de création. |
| `length`, `width` | Plus grande puis plus petite dimension de `shape` (FR-020). |
| `thickness`, `material` | Valeurs communes aux pièces de la ligne. |

**Regroupement** (FR-019) : deux pièces sont sur la même ligne si elles ont les mêmes `length` et `width` remises en ordre, la même `thickness` et le même matériau. Le matériau est comparé après suppression des espaces, sans tenir compte de la casse, et la ligne affiche sa première écriture.

**Tri** : matériau, puis épaisseur décroissante, longueur décroissante et largeur décroissante.

### CutTotals (calculés, jamais enregistrés)

Une entrée par couple matériau et épaisseur : nombre de pièces et surface, somme de `length × width`. La surface est calculée en entiers puis convertie en m² uniquement pour l'affichage, avec deux décimales.

### EditorState (état de l'interface, jamais enregistré)

| Champ | Description |
|---|---|
| `project` | Projet courant. |
| `undo`, `redo` | États précédents et suivants. 100 états au maximum. |
| `savedProject` | État du dernier enregistrement. Le projet est « modifié » s'il diffère de celui-ci. |
| `selection` | Identifiants des pièces sélectionnées. Non concernée par l'annulation, mais nettoyée des pièces qui n'existent plus. |

## Règle de génération du caisson

Pour `W`, `H`, `D`, `e` (`boardThickness`), `f` (`backThickness`) et `n` (`shelfCount`), avec `P = D − f` et `Hi = H − 2e` :

| Pièce | Quantité | Longueur | Largeur | Épaisseur | Position (x, y, z) | u, v |
|---|---|---|---|---|---|---|
| Côté gauche | 1 | `H` | `P` | `e` | `0, 0, f` | `+y`, `+z` |
| Côté droit | 1 | `H` | `P` | `e` | `W − e, 0, f` | `+y`, `+z` |
| Dessous | 1 | `W − 2e` | `P` | `e` | `e, 0, f` | `+x`, `+z` |
| Dessus | 1 | `W − 2e` | `P` | `e` | `e, H − e, f` | `+x`, `+z` |
| Étagère k (1 à n) | n | `W − 2e` | `P` | `e` | `e, yₖ, f` | `+x`, `+z` |
| Fond (si `f > 0`) | 1 | `H` | `W` | `f` | `0, 0, 0` | `+y`, `+x` |

Avec `yₖ = e + (k − 1) × e + arrondi(k × (Hi − n × e) / (n + 1))`. Cet arrondi peut décaler une étagère de 0,05 mm au plus. Il concerne uniquement sa position, jamais ses cotes.

**Exemple de référence** : 800 × 1800 × 400 mm, bois de 18 mm, fond de 5 mm, 3 étagères :

| Ligne | Quantité | Cotes (mm) |
|---|---|---|
| Côté gauche, Côté droit | 2 | 1800 × 395 × 18 |
| Dessous, Dessus, Étagère 1 à 3 | 5 | 764 × 395 × 18 |
| Fond | 1 | 1800 × 800 × 5 |

Les étagères sont à 427,5 mm d'écart, avec `yₖ` de 445,5, 891 et 1336,5 mm.

## Transitions d'état

**Modèle du caisson**

```text
aucun (template = null) ── créer un caisson ──▶ généré (customized = false)
généré ── modifier une pièce ──▶ retouché (customized = true)
généré ── changer les paramètres ──▶ généré (pièces régénérées)
retouché ── changer les paramètres + confirmer ──▶ généré (pièces régénérées)
retouché ── changer les paramètres + renoncer ──▶ retouché (rien ne change)
```

Annuler restaure aussi `template`, donc `customized` reprend sa valeur précédente.

**Document**

```text
nouveau ou ouvert (non modifié) ── action ──▶ modifié
modifié ── enregistrer ──▶ non modifié
modifié ── annuler jusqu'à l'état enregistré ──▶ non modifié
modifié ── fermer ou ouvrir un autre projet ──▶ question : enregistrer, abandonner, annuler
```
