# Data Model: Calepinage des panneaux

Toutes les longueurs sont des entiers en dixièmes de millimètre (`Tenths`). Un panneau a son origine en bas à gauche ; `x` suit sa longueur et `y` sa largeur.

## Enregistré avec le projet

### Project (étendu)

| Champ | Type | Règle |
|---|---|---|
| `layout` | `LayoutSettings` | Toujours présent ; valeurs par défaut pour un projet neuf ou migré |

### LayoutSettings

| Champ | Type | Règle | Défaut |
|---|---|---|---|
| `kerf` | `Tenths` | Entier de 0 à 200 (20 mm) | 30 |
| `edgeMargin` | `Tenths` | Entier de 0 à 1000 (100 mm) | 0 |
| `panels` | `PanelStock[]` | Au plus une entrée par couple matériau et épaisseur, triées par matériau puis épaisseur décroissante | `[]` |

### PanelStock

| Champ | Type | Règle |
|---|---|---|
| `material` | `string` | Sans espaces autour ; même limite que le matériau d'une pièce ; peut être vide |
| `thickness` | `Tenths` | Dimension valide |
| `length` | `Tenths` | Dimension valide ; suit le fil |
| `width` | `Tenths` | Dimension valide |
| `grain` | `boolean` | Vrai si le sens du fil doit être respecté |

Le couple est identifié par `materialKey(material)` et `thickness`. Sans entrée, le panneau vaut 28 000 × 20 700, sans sens du fil.

Règle commune : `2 × edgeMargin` DOIT être strictement inférieur à la longueur et à la largeur de chaque panneau enregistré, et de chaque groupe présent dans le projet, au moment du réglage.

## Calculé, jamais enregistré

### Layout

| Champ | Type | Rôle |
|---|---|---|
| `groups` | `LayoutGroup[]` | Dans l'ordre des totaux de la liste de découpe |
| `complete` | `boolean` | Vrai si toutes les pièces sont placées |

### LayoutGroup

| Champ | Type | Rôle |
|---|---|---|
| `material`, `thickness` | | Identité du groupe |
| `stock` | `{ length, width, grain, isDefault }` | Panneau utilisé |
| `panelCount` | `number` | Nombre de panneaux, somme des quantités |
| `pieceCount`, `placedCount` | `number` | Pièces du groupe, et pièces placées |
| `usedArea`, `panelArea` | `number` | Surfaces totales, en dixièmes de mm au carré |
| `panels` | `LaidOutPanel[]` | Les plus remplis d'abord, identiques regroupés |
| `unplaced` | `UnplacedPiece[]` | Pièces impossibles à placer |

### LaidOutPanel

| Champ | Type | Rôle |
|---|---|---|
| `quantity` | `number` | Nombre de panneaux à ce placement |
| `placements` | `Placement[]` | Pièces posées |
| `offcuts` | `Rect[]` | Chutes, sans la marge de bord |
| `cuts` | `Cut[]` | Coupes dans l'ordre |
| `usedArea` | `number` | Surface des pièces d'un panneau |

Deux panneaux sont identiques si leurs placements ont les mêmes positions, cotes, rotations et numéros de plan, quels que soient les noms.

### Placement

| Champ | Type | Rôle |
|---|---|---|
| `x`, `y` | `Tenths` | Coin bas gauche |
| `sizeX`, `sizeY` | `Tenths` | Encombrement sur le panneau |
| `rotated` | `boolean` | Vrai si la longueur de la pièce suit la largeur du panneau |
| `names` | `string[]` | Noms distincts, à cet emplacement, sur tous les panneaux regroupés |
| `pieceIds` | `string[]` | Les pièces concernées |
| `plan` | `number \| null` | Numéro du plan de forme, repris de la liste de découpe |

### Rect

`x`, `y`, `sizeX`, `sizeY`.

### Cut

| Champ | Type | Rôle |
|---|---|---|
| `order` | `number` | À partir de 1, numérotation propre à chaque panneau |
| `direction` | `'along' \| 'across'` | Parallèle à la longueur ou à la largeur du panneau |
| `at` | `Tenths` | Position de la ligne de coupe sur le panneau, du côté de la pièce ou du premier morceau |
| `from`, `to` | `Tenths` | Étendue de la coupe |
| `offset` | `Tenths` | Distance au bord du morceau en cours : la cote à reporter sur la scie |
| `trim` | `boolean` | Vrai pour une coupe de délignage de la marge |
| `kerfBefore` | `boolean` | Vrai si le trait de scie est avant la ligne : délignage du bord bas ou gauche, dont la matière gardée est après la ligne |

### UnplacedPiece

| Champ | Type | Rôle |
|---|---|---|
| `pieceId`, `name` | | La pièce |
| `length`, `width` | `Tenths` | Ses cotes saisies |
| `reason` | `'too-large' \| 'grain'` | `grain` : elle rentrerait si elle pouvait être tournée |

## Invariants d'un résultat

Vérifiés par un contrôleur indépendant de l'algorithme, dans les tests :

1. Chaque pièce du projet est soit placée exactement une fois, soit dans `unplaced`.
2. Un placement est entièrement dans la surface utile, et ses cotes sont celles de la pièce.
3. Deux placements d'un même panneau sont séparés d'au moins `kerf` sur un axe.
4. Avec le sens du fil, aucun placement n'est tourné.
5. En rejouant `cuts` dans l'ordre, chaque coupe sépare en deux un seul morceau, d'un bord à l'autre, et l'on obtient exactement les placements et les chutes.
