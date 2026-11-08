# Research: Pièces de forme : arrondis et découpes

Aucune nouvelle dépendance n'est prévue. Les décisions de la première version (`specs/001-furniture-cut-list/research.md`) restent valables : cotes entières en dixièmes de millimètre, cœur sans interface, projet immuable.

## R1. Représentation d'une forme

- **Decision**: nouvelle variante `shape: { kind: "shaped", length, width, corners, cutouts }`. Une pièce sans coin modifié ni découpe redevient toujours `{ kind: "rectangle" }`.
- **Rationale**: c'est la porte ouverte par R3 de la première version. Une forme est uniquement retranchée du rectangle, donc `length` et `width` restent le rectangle de bois, et `shapeExtent`, l'encombrement, l'alignement et les totaux ne changent pas. Le retour au rectangle garantit qu'un meuble sans forme reste strictement identique à aujourd'hui (FR-023).
- **Alternatives considered**: ajouter `corners` et `cutouts` à toutes les pièces (alourdit chaque fichier et chaque comparaison) ; stocker un contour de points (perd les cotes saisies, qui doivent être restituées telles quelles, FR-021).

## R2. Repère à plat et positions des découpes

- **Decision**: la forme se décrit dans le plan de la pièce : `u` le long de la longueur, `v` le long de la largeur, en dixièmes de millimètre. Les bords s'appellent gauche (`u = 0`), droit, bas (`v = 0`) et haut. Une découpe mémorise sa distance à un bord choisi sur chaque direction. Pour un rectangle, c'est la distance au bord de la découpe ; pour un trou rond, la distance à son centre.
- **Rationale**: le repère suit la pièce, donc la forme ne change pas quand elle tourne (FR-012). Garder le bord de référence donne le comportement de FR-013 et restitue sur le plan la cote que l'utilisateur a saisie. On perce un trou rond à partir de son centre.
- **Alternatives considered**: coordonnées absolues depuis un coin (une découpe « à 50 mm du bord droit » ne suivrait pas ce bord).

## R3. Validation en entiers

- **Decision**: tout est vérifié en arithmétique entière, en doublant les coordonnées pour les trous de diamètre impair. Les règles sont celles de `data-model.md`. Une encoche est simplement une découpe rectangulaire qui touche un bord ; un trou rond doit rester strictement à l'intérieur.
- **Rationale**: principe IV. Si les découpes ne se touchent pas, qu'aucune ne s'étend sur toute une largeur ou longueur et qu'aucune ne touche deux bords opposés, la pièce reste forcément d'un seul tenant : FR-005 n'exige donc pas d'analyse de contour. Une comparaison de la forme avec une grille d'échantillons le confirme dans les tests.
- **Alternatives considered**: bibliothèque de géométrie (dépendance, flottants). Pour une découpe rectangulaire à angles arrondis ou un coin modifié, la vérification utilise le carré englobant : elle peut refuser un cas limite valide, mais n'accepte jamais une forme invalide.

## R4. Rendu 3D

- **Decision**: les pièces rectangulaires gardent la boîte partagée. Une pièce de forme obtient une géométrie extrudée à partir d'un contour et de trous, mise en cache selon la forme et l'épaisseur. Les arcs sont découpés en 16 segments par quart de tour. Le contour vif est calculé avec un seuil d'angle, pour ne pas dessiner les facettes des arrondis. La matrice de la pièce est construite à partir des axes signés `u`, `v` et de leur produit vectoriel.
- **Rationale**: la plupart des pièces restent inchangées. Les pièces identiques partagent leur géométrie, et le lancer de rayon sur la géométrie réelle fait que le clic passe à travers les trous (FR-014). Les axes signés, inutiles pour un rectangle, deviennent significatifs ici comme prévu.
- **Alternatives considered**: opérations booléennes sur des volumes (dépendance et coût injustifiés pour des formes traversantes).

## R5. Chevauchements selon la forme réelle

- **Decision**: l'encombrement rectangulaire reste le premier filtre. Deux rectangles qui se recoupent gardent le calcul actuel. Sinon, l'intersection des deux encombrements est découpée en cellules par une grille de plans critiques : les bords de toutes les découpes et coins des deux pièces, plus des plans supplémentaires, au plus 1 mm ou 1/32 de l'étendue, sur les parties courbes. Un test du centre de chaque cellule dans les deux pièces conclut, en s'arrêtant au premier recouvrement.
- **Rationale**: FR-015 repose sur des bords rectilignes : une planche logée exactement dans une encoche tombe sur des plans de la grille, donc le résultat est exact. Sur les courbes, le test est approché à moins de 1 mm environ, ce qui convient à un simple signalement. Le filtre élimine presque toutes les paires.
- **Alternatives considered**: découpage exact de polygones (bien plus de code pour un avertissement) ; garder l'encombrement (fausses alertes sur l'usage principal d'une encoche).

## R6. Regroupement des formes identiques

- **Decision**: chaque forme a une clé canonique : découpes et coins convertis en positions absolues puis triés, la plus petite des écritures obtenues par symétries de la pièce (4, ou 8 pour un carré), dans un repère où la longueur est la plus grande dimension. Une pièce rectangulaire a une clé vide.
- **Rationale**: FR-017 demande de reconnaître une pièce tournée ou retournée. Comme tout est traversant, retourner la pièce donne bien la même découpe.
- **Alternatives considered**: comparer les valeurs saisies (deux formes identiques, cotées depuis des bords différents, ne seraient pas regroupées).

## R7. Édition

- **Decision**: un bouton « Modifier la forme » remplace le panneau de la liste de découpe par l'éditeur le temps de l'édition, ce qui laisse la vue 3D visible. L'éditeur contient l'aperçu SVG à l'échelle et les champs. Un glissement ne touche que l'aperçu et produit une seule action annulable au relâchement, comme les poignées 3D. En glissant, les valeurs sont arrondies au millimètre et bornées à la plage valide.
- **Rationale**: le panneau de gauche, de 250 pixels, est trop étroit pour un aperçu utile. Les pièces multiples n'ont pas d'aperçu commun manipulable : on y propose seulement les coins et l'ajout d'une découpe (FR-011).
- **Alternatives considered**: boîte de dialogue modale (masquerait le résultat en 3D).

## R8. Plans dans le PDF

- **Decision**: chaque forme distincte a un plan à l'échelle, sous la liste : le contour avec les cotes d'ensemble, chaque coin modifié et chaque découpe portant un numéro, et un tableau des numéros avec leurs cotes en toutes lettres (« Trou rond Ø 60, centre à 150 du bord gauche et 150 du bord bas »). Les plans sont numérotés dans l'ordre de la liste, et le plan utilise les bords de référence de la première pièce de sa ligne.
- **Rationale**: la lisibilité est le critère (SC-003). Des lignes de cote automatiques se croisent dès qu'il y a plusieurs découpes, alors qu'un numéro et un tableau restent lisibles quel que soit le nombre de découpes, en noir et blanc. Un test compte les plans, et le rendu sera contrôlé à l'œil, puisque la première version a montré que les tests ne voient pas la mise en page.
- **Alternatives considered**: placement automatique de lignes de cote (complexe et fragile pour un gain faible).

## R9. Format de fichier

- **Decision**: `formatVersion` passe à 2, et le logiciel écrit toujours la version courante. La migration de 1 vers 2 ne change rien aux données.
- **Rationale**: c'est ce qui permet à une ancienne version de CotaBois d'afficher « version plus récente » plutôt qu'« abîmé » (cas limite de la spec). Une seule version écrite évite deux chemins à tester.
- **Alternatives considered**: n'écrire la version 2 que si le projet a des formes (un même projet changerait de format selon son contenu).

## R10. Risques à lever tôt

- **Fluidité** : le calcul des géométries de forme doit tenir SC-004 et SC-005 sur 200 pièces dont 50 de forme. Le générateur du projet de test sera étendu dès la première tâche d'affichage.
- **Correspondance entre l'aperçu et la pièce** : l'utilisateur doit savoir quel coin de l'aperçu correspond à quel coin en 3D. L'aperçu affiche les noms des bords, et la 3D se met à jour immédiatement. À évaluer à l'essai.
- **Précision du test de chevauchement sur les courbes** : approchée, voir R5.
