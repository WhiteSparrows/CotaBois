# Research: Chants et coût du meuble

Aucune question technique ne restait ouverte après la spécification. Chaque décision ci-dessous se vérifie par un calcul à la main, sans prototype.

## R1. Bords chantés dans le modèle

**Decision**: `Piece.edges`, un enregistrement des quatre bords `bottom`, `top`, `left`, `right`, chacun vrai ou faux. Il est toujours présent, tous faux par défaut. Dans le fichier, il s'écrit comme la liste des bords chantés, dans cet ordre.

**Rationale**: les bords sont exprimés dans le repère de la pièce, comme les coins et les découpes. Une rotation ne change que l'orientation, une duplication ou un copier-coller copient la pièce entière, et un changement de dimension ne touche pas aux bords : FR-005 est respecté sans code particulier. Un champ toujours présent évite les cas « absent » ; une liste dans le fichier reste courte et lisible.

**Alternatives considered**: bords exprimés dans le repère du meuble (avant, arrière…), qui ne survivent pas à une rotation ; champ facultatif, qui obligerait chaque lecture à traiter l'absence.

## R2. Cote à couper

**Decision**: `cutSize(piece, settings)` dans `edges.ts` : longueur moins l'épaisseur du chant pour chaque bord `left` et `right` chanté, largeur moins l'épaisseur pour chaque bord `bottom` et `top` chanté. L'épaisseur est celle du chant du groupe de la pièce (matériau et épaisseur), 0 par défaut. La cote à couper est toujours calculée, jamais enregistrée (principe III).

Toute opération qui pourrait rendre une cote à couper inférieure à 0,1 mm la refuse et nomme la pièce : la pose d'un chant, le changement d'épaisseur d'un chant, le changement de dimension d'une pièce et le changement de matériau ou d'épaisseur d'une pièce.

**Rationale**: FR-007. Par exemple, une étagère de 764 × 395 avec un chant de 2 mm sur le bord bas se coupe à 764 × 393.

## R3. Regroupement dans la liste

**Decision**: la clé canonique de `shape.ts` devient commune à la forme et aux chants : `canonicalPieceKey(shape, edges)`. Elle applique la même normalisation (longueur la plus grande) et les mêmes symétries aux bords qu'aux coins. Pour un rectangle sans chant, elle reste vide, et la liste ne change pas (FR-019).

**Rationale**: chercher séparément la clé de la forme et celle des chants pourrait choisir deux symétries différentes, et regrouper à tort une tablette arrondie chantée côté arrondi avec une autre chantée côté droit. Sous ces symétries, un rectangle non carré se résume à « nombre de bords longs chantés, nombre de bords courts chantés », d'où le texte `2 longs, 1 court`. Un carré se résume au nombre de bords et, pour deux bords, à leur position voisine ou opposée.

## R4. Ce que montre la liste de découpe

**Decision**: une ligne affiche la cote à couper, et aussi la cote finie si elle diffère, par exemple `764 × 393 (fini 764 × 395)`. Les totaux de surface portent sur la cote à couper. Les lignes et totaux restent identiques sans chant.

**Rationale**: la cote à couper est celle que l'on reporte sur la scie, et FR-007 demande aussi la cote finie quand elles diffèrent. La spec de la première version veut des totaux sur le rectangle de bois nécessaire, qui est désormais la cote à couper.

## R5. Métrage

**Decision**: pour chaque groupe, la somme, sur chaque bord chanté, de la longueur du côté fini du rectangle plus la surlongueur ; le tout en dixièmes de millimètre, entiers. L'affichage arrondit au centimètre supérieur : `formatMeters(tenths)` donne `7,56 m`. La ligne de la liste porte aussi son propre métrage, pour la colonne du CSV.

**Rationale**: FR-008 et FR-009. Exemple de la spec : 2 × 18 000 + 5 × 7 640 = 74 200 dixièmes, soit 7,42 m ; avec 7 bords de surlongueur de 200 dixièmes, 75 600, soit 7,56 m. Le côté fini, et non la cote à couper, est la longueur sur laquelle on plaque le chant.

## R6. Montants

**Decision**: des centimes entiers (`Cents`). `parseEuros` accepte `45,90`, `45.9`, `45`, `1 234,50` et un signe `€` final ; il refuse le négatif, plus de deux décimales et plus de 100 000 €. Les panneaux coûtent `panneaux × prix`, exact. Un chant coûte `arrondi(centimètres × prix au mètre / 100)`, arrondi au centime le plus proche, avec les demis vers le haut, en entiers. Le métrage en centimètres est celui affiché. Le total est la somme des achats déjà arrondis (FR-015).

**Rationale**: exemple de la spec : 756 cm × 85 c/m = 64 260, divisé par 100 donne 642,6, arrondi à 643 c, soit 6,43 €. Avec 2 × 4 590 = 9 180 c, le total vaut 9 823 c, soit 98,23 €. Aucun flottant n'intervient dans un montant enregistré ou affiché.

**Alternatives considered**: euros en nombres décimaux, exposés à des erreurs d'arrondi visibles ; prix au mètre carré, écarté par l'utilisateur.

## R7. Réglages et prix

**Decision**: `PanelStock` gagne `edgeThickness` (0 à 100 dixièmes), `panelPrice` et `edgePrice` (centimes ou `null`). `LayoutSettings` gagne `edgeOverhang` (0 à 1000 dixièmes, 200 par défaut). Un groupe sans entrée a un chant d'épaisseur nulle et aucun prix. Régler un prix, un chant ou la surlongueur ne marque pas un caisson comme retouché ; poser un chant, si.

**Rationale**: un chant et deux prix par matériau et épaisseur, au même endroit que la taille du panneau, avec le même comportement en cas de renommage (spec, cas limites). Un prix absent (`null`) se distingue d'un prix nul.

## R8. Coût

**Decision**: `computeCost(project, layout)` dans `cost.ts` renvoie une ligne par achat (panneaux puis chant de chaque groupe, dans l'ordre des totaux), le total des montants connus, et la liste de ce qui manque. Un groupe sans panneau placé ne coûte rien en panneaux. Un chant dont le métrage est nul n'apparaît pas.

**Rationale**: FR-013 et FR-014 : le total n'est « complet » que si chaque achat présent a son prix. Le calepinage reste la seule source du nombre de panneaux.

## R9. Calepinage

**Decision**: `computeLayout` place chaque pièce à sa cote à couper, dans le repère de la pièce (la longueur suit le fil), et le dessin affiche cette cote.

**Rationale**: FR-007. Sans chant ou avec une épaisseur nulle, la cote à couper est la cote finie, et le calepinage ne change pas.

## R10. Vue 3D

**Decision**: une fine bande colorée, posée juste à l'extérieur de la face du bord chanté, sur toute sa longueur. Son épaisseur visible est fixe, quelle que soit l'épaisseur réelle du chant. Les bandes sont construites à partir du repère de la pièce, rectangle ou pièce de forme.

**Rationale**: FR-003. Une bande fixe reste visible même avec un chant de 0,4 mm. Sur une pièce de forme, la bande suit le côté du rectangle, ce qui correspond à la règle de longueur de la spec.

## R11. Option du caisson

**Decision**: `CaissonParams.frontEdges`, faux par défaut. Les côtés, le dessus, le dessous et les étagères ont leur largeur le long de la profondeur, avec `v` vers l'avant : leur bord avant est `top`. Le fond n'a aucun chant.

**Rationale**: FR-016. Le bord avant de chaque pièce se vérifie dans le test du caisson de référence, et la régénération applique l'option comme les autres paramètres.

## R12. Format de fichier

**Decision**: version 4. Ajouts : `edges` dans chaque pièce, après `shape` ; `edgeOverhang` dans `layout` ; `edgeThickness`, `panelPrice`, `edgePrice` dans chaque panneau ; `frontEdges` dans les paramètres du caisson. La migration depuis la version 3 met des valeurs neutres : aucun chant, épaisseur nulle, prix absents, surlongueur de 20 mm, option désactivée.

**Rationale**: FR-017 et FR-018. Une surlongueur par défaut n'a aucun effet tant qu'aucun chant n'est posé, donc un ancien projet s'ouvre à l'identique.
