# Data Model: Pièces de forme

Complète `specs/001-furniture-cut-list/data-model.md`, qui reste valable. Toutes les longueurs sont des entiers en dixièmes de millimètre (`Tenths`).

## Repère à plat

`u` suit la longueur, de 0 à `length`. `v` suit la largeur, de 0 à `width`. Les bords sont `left` (`u = 0`), `right` (`u = length`), `bottom` (`v = 0`) et `top` (`v = width`).

## Entités

### Shape

Variante ajoutée : `ShapedShape`. La variante `{ kind: "rectangle", length, width }` ne change pas.

| Champ | Type | Règles |
|---|---|---|
| `kind` | `"shaped"` | |
| `length`, `width` | `Tenths` | Les mêmes règles que pour un rectangle. |
| `corners` | `{ bottomLeft, bottomRight, topRight, topLeft }` | Un `CornerTreatment` pour chacun. |
| `cutouts` | liste de `Cutout` | De 0 à 50. Ordre de création. Identifiants uniques dans la pièce. |

Une forme sans coin modifié et sans découpe DOIT être enregistrée comme un rectangle.

### CornerTreatment

| Variante | Champs | Règles |
|---|---|---|
| `{ kind: "straight" }` | | |
| `{ kind: "round", radius }` | `radius : Tenths` | 1 ou plus. |
| `{ kind: "chamfer", size }` | `size : Tenths` | 1 ou plus. Chanfrein à 45°, `size` étant la longueur retirée sur chaque côté. |

On note `taille` le `radius` ou le `size`, et 0 pour un coin droit. Sur chaque côté, la somme des tailles de ses deux coins DOIT être inférieure ou égale à la longueur de ce côté. Le maximum indiqué à l'utilisateur est la plus petite des deux places restantes.

### Cutout

| Champ | Type | Règles |
|---|---|---|
| `id` | texte | Unique dans la pièce. |
| `kind` | `"rectangle"` ou `"circle"` | |
| `sizeU`, `sizeV` | `Tenths` | Rectangle uniquement. De 1 à la dimension de la pièce. |
| `cornerRadius` | `Tenths` | Rectangle uniquement. 0 ou plus, au plus la moitié du plus petit côté. Ne s'applique qu'aux angles situés à l'intérieur de la pièce. |
| `diameter` | `Tenths` | Cercle uniquement. 1 ou plus. |
| `fromU` | `{ edge: "left" \| "right", distance }` | `distance` entre 0 et la dimension de la pièce. |
| `fromV` | `{ edge: "bottom" \| "top", distance }` | Idem. |

Pour un rectangle, `distance` va du bord choisi au côté le plus proche de la découpe. Pour un cercle, elle va du bord choisi au centre.

## Règles de validation

Une forme est valide si toutes ces règles sont vraies, vérifiées en entiers :

1. Limites de champs ci-dessus.
2. Coins : voir `CornerTreatment`.
3. Chaque découpe reste dans le rectangle de la pièce.
4. Aucune découpe rectangulaire ne s'étend sur toute la longueur ou toute la largeur, ni ne touche deux bords opposés.
5. Un cercle reste strictement à l'intérieur de la pièce, sans toucher un bord.
6. Deux découpes ne se touchent pas et ne se recouvrent pas. Un rectangle est compté avec ses angles vifs.
7. Une découpe ne touche pas le carré de `taille × taille` d'un coin modifié.

Chaque refus indique ce qui ne va pas, et la valeur maximale possible quand elle existe.

Ces règles sont revérifiées à chaque changement de `length` ou `width` : une découpe garde son bord de référence et sa distance, et le changement est refusé si la forme n'est plus valide.

## Liste de découpe

`CutLine` gagne :

| Champ | Description |
|---|---|
| `shapeKey` | Clé canonique. Vide pour un rectangle. Fait partie du critère de regroupement. |
| `plan` | Numéro de plan, de 1 à n dans l'ordre de la liste, ou `null`. |
| `shape` | La forme de la première pièce de la ligne, ou `null`. |

`CutTotals` ne change pas : la surface reste celle du rectangle de bois.

## Exemple de référence

Tablette de 800 × 300 × 18 mm, `length = 8000`, `width = 3000` :

| Élément | Valeurs |
|---|---|
| `topLeft`, `topRight` | Arrondis, `radius = 400` |
| Encoche | `sizeU = 500`, `sizeV = 300`, `fromU = left 0`, `fromV = bottom 0` |
| Trou rond | `diameter = 600`, `fromU = left 1500`, `fromV = bottom 1500` |

- Liste de découpe : 800 × 300 × 18 mm, plan 1.
- Sur les côtés seuls, `topLeft` pourrait atteindre `min(3000 − 0, 8000 − 400) = 3000`, soit 300 mm.
- La règle 7 le réduit : son carré touche le trou dès que sa taille atteint 1200, car le trou occupe `u` et `v` de 1200 à 1800. Le maximum réel est donc 1199, soit 119,9 mm. L'encoche ne limiterait qu'à partir de 2700.

## Transitions

Toute modification de forme suit les règles de la première version : nouveau projet immuable, une entrée d'historique par action, `customized` à `true` sur un caisson. Un glissement dans l'aperçu est une seule action.
