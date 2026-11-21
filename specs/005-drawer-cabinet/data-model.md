# Data Model: Meuble à tiroirs

Toutes les longueurs sont des entiers en dixièmes de millimètre (`Tenths`).

## Enregistré avec le projet

### Template (union)

| Variante | `kind` | Réglages |
|---|---|---|
| `CaissonTemplate` | `caisson` | `CaissonParams`, inchangés |
| `DrawerCabinetTemplate` | `drawers` | `DrawerParams` |

Les deux ont `customized`, vrai dès qu'une pièce a été retouchée à la main.

### DrawerParams

| Champ | Type | Règle | Défaut |
|---|---|---|---|
| `width`, `height`, `depth` | `Tenths` | Dimension valide | 6000, 7200, 5600 |
| `boardThickness` | `Tenths` | Dimension valide | 180 |
| `backThickness` | `Tenths` | 0 ou dimension valide, inférieure à la profondeur | 50 |
| `drawerCount` | `number` | Entier de 1 à 10 | 3 |
| `frontGap` | `Tenths` | Entier de 0 à 100 (10 mm) | 30 |
| `slideGap` | `Tenths` | Entier de 0 à 500 (50 mm), de chaque côté | 125 |
| `drawerThickness` | `Tenths` | Dimension valide, bois des côtés, de l'avant et de l'arrière | 150 |
| `drawerBottomThickness` | `Tenths` | Dimension valide | 50 |
| `frontEdges` | `true` facultatif | Comme pour le caisson ; absent quand l'option est désactivée | absent |

Règles communes, dans l'ordre de `research.md`, R7 : hauteur des côtés de tiroir ≥ 500, profondeur de boîte ≥ 2500, avant et arrière ≥ 1, tiroirs entre le dessous et le dessus.

## Calculé, jamais enregistré

Les pièces générées sont des pièces ordinaires ; aucune n'est liée au modèle après génération. Pour un meuble de `n` tiroirs :

| Pièces | Nombre | Cotes | Épaisseur |
|---|---|---|---|
| Côtés, dessus, dessous, fond | 5, ou 4 sans fond | Celles du caisson sans étagère | Bois du caisson, fond |
| Façades | `n` | `research.md`, R3 | Bois du caisson |
| Côtés de tiroir | 2`n` | Profondeur de boîte × hauteur des côtés | `drawerThickness` |
| Avants et arrières | 2`n` | (Largeur de boîte − 2 × `drawerThickness`) × hauteur des côtés | `drawerThickness` |
| Fonds de tiroir | `n` | Largeur de boîte × profondeur de boîte | `drawerBottomThickness` |

Tous les matériaux sont vides, comme pour le caisson.
