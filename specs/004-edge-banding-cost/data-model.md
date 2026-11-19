# Data Model: Chants et coût du meuble

Toutes les longueurs sont des entiers en dixièmes de millimètre (`Tenths`), tous les montants des entiers en centimes d'euro (`Cents`).

## Enregistré avec le projet

### Piece (étendue)

| Champ | Type | Règle |
|---|---|---|
| `edges` | `Record<EdgeName, boolean>` | Toujours présent ; tous faux par défaut |

`EdgeName` : `bottom` et `top` bornent la largeur et longent la longueur ; `left` et `right` bornent la longueur et longent la largeur. Ce sont les noms de l'éditeur de forme : bas, haut, gauche, droit.

### CaissonParams (étendus)

| Champ | Type | Règle | Défaut |
|---|---|---|---|
| `frontEdges` | `boolean` | Chant sur le bord `top` des côtés, du dessus, du dessous et des étagères | `false` |

### LayoutSettings (étendus)

| Champ | Type | Règle | Défaut |
|---|---|---|---|
| `edgeOverhang` | `Tenths` | Entier de 0 à 1000 (100 mm), ajouté à chaque bord chanté | 200 |

### PanelStock (étendu)

| Champ | Type | Règle | Défaut sans entrée |
|---|---|---|---|
| `edgeThickness` | `Tenths` | Entier de 0 à 100 (10 mm) | 0 |
| `panelPrice` | `Cents \| null` | Entier de 0 à 10 000 000 (100 000 €), ou absent | `null` |
| `edgePrice` | `Cents \| null` | Prix d'un mètre de chant, mêmes bornes | `null` |

Règle commune : pour chaque pièce, la cote à couper doit valoir au moins 1 dixième sur chaque dimension. Elle est vérifiée à chaque opération qui pourrait la réduire.

## Calculé, jamais enregistré

### Cote à couper

`cutSize(piece, settings)` : `{ length, width }` avec

- `length = shape.length − e × (nombre de bords left et right chantés)`
- `width = shape.width − e × (nombre de bords bottom et top chantés)`

où `e` est l'épaisseur du chant du groupe de la pièce.

### CutLine (étendue)

| Champ | Type | Rôle |
|---|---|---|
| `length`, `width` | `Tenths` | Désormais la cote à couper, la plus grande d'abord |
| `finishedLength`, `finishedWidth` | `Tenths` | La cote finie, dans la même orientation |
| `edges` | `string` | Résumé, par exemple `2 longs, 1 court` ; vide sans chant |
| `edgeLength` | `Tenths` | Métrage de la ligne, toutes pièces et surlongueurs comprises |

Deux pièces sont sur la même ligne si leurs cotes finies, leur épaisseur, leur matériau et leur clé canonique commune de forme et de chants sont égaux.

### CutTotal (étendu)

| Champ | Type | Rôle |
|---|---|---|
| `edgeCount` | `number` | Nombre de bords chantés du groupe |
| `edgeLength` | `Tenths` | Métrage du chant du groupe |

### Cost

| Champ | Type | Rôle |
|---|---|---|
| `items` | `CostItem[]` | Les panneaux, puis le chant, de chaque groupe, dans l'ordre des totaux |
| `total` | `Cents` | Somme des montants connus |
| `complete` | `boolean` | Vrai si chaque achat a son prix |

### CostItem

| Champ | Type | Rôle |
|---|---|---|
| `kind` | `'panels' \| 'edge'` | Achat de panneaux ou de chant |
| `material`, `thickness` | | Groupe |
| `quantity` | `number` | Nombre de panneaux, ou centimètres de chant |
| `unitPrice` | `Cents \| null` | Prix d'un panneau ou d'un mètre |
| `amount` | `Cents \| null` | Montant arrondi au centime, ou `null` sans prix |

Un achat de panneaux n'apparaît que si le groupe a au moins un panneau placé, et un achat de chant que si son métrage n'est pas nul.
