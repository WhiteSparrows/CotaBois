# Research: Meuble à tiroirs

Aucune question technique ne restait ouverte après la spécification. Chaque règle ci-dessous se vérifie à la main ; l'exemple de référence est le meuble de 600 × 720 × 560 mm, bois de 18 mm, fond de 5 mm, 3 tiroirs, avec les réglages par défaut.

## R1. Un modèle de plus

**Decision**: `Template` devient une union : `CaissonTemplate | DrawerCabinetTemplate`, distinguées par `kind` (`caisson` ou `drawers`). `templates.ts` expose `applyTemplate(project, choice, nextId)`, qui aiguille vers `applyCaisson` ou `applyDrawerCabinet`.

**Rationale**: le principe III demande d'ajouter des modèles sans réécrire le modèle. Le reste du logiciel ne lit que `customized` et ne connaît pas les réglages d'un modèle : seuls le fichier projet et le formulaire en dépendent.

## R2. Carcasse commune

**Decision**: la génération du caisson sans étagère est exportée par `caisson.ts` et réutilisée : 2 côtés, dessus, dessous et fond, mêmes cotes, mêmes positions et mêmes noms.

**Rationale**: dans l'exemple, côtés de 720 × 555, dessus et dessous de 564 × 555, fond de 720 × 600, exactement comme un caisson de mêmes dimensions. Une seule règle à tester et à corriger.

## R3. Façades

**Decision**: avec `j` le jeu entre façades et `n` le nombre de tiroirs :

- largeur = largeur du meuble − `j` ;
- hauteur commune = ⌊(hauteur − `n` × `j`) / `n`⌋, en dixièmes ; le reste de la division va à la façade du bas ;
- placement : `x` = ⌊`j` / 2⌋ ; la façade du bas commence à `y` = ⌊`j` / 2⌋, chaque façade suivante `j` plus haut que la fin de la précédente ; `z` = profondeur du meuble, devant le caisson ;
- épaisseur : celle du bois du caisson ; numérotation de haut en bas (`Façade 1` en haut).

**Rationale**: exemple : 600 − 3 = 597 et (720 − 9) / 3 = 237. La façade du haut finit à `hauteur − ⌈j / 2⌉`, ce qui laisse le même jeu en haut et en bas. Avec 721 mm, (7210 − 90) / 3 = 2373,33… : trois façades de 237,3 mm, dont celle du bas reçoit 0,1 mm de plus.

## R4. Boîtes de tiroir

**Decision**: avec `e` l'épaisseur du bois du caisson, `c` le jeu des coulisses, `t` l'épaisseur du bois des tiroirs, `f` celle de leur fond et `p` la profondeur des pièces du caisson (profondeur − fond) :

- largeur de boîte = largeur − 2`e` − 2`c` ;
- hauteur des côtés = hauteur commune des façades − 40 mm ; toutes les boîtes ont la même ;
- profondeur de boîte = ⌊(`p` − 10 mm) / 50 mm⌋ × 50 mm ;
- 2 côtés : profondeur × hauteur ; avant et arrière, entre les côtés : (largeur de boîte − 2`t`) × hauteur ; fond, sous la boîte : largeur de boîte × profondeur.

**Rationale**: exemple : 600 − 36 − 25 = 539 ; 237 − 40 = 197 ; ⌊(555 − 10) / 50⌋ × 50 = 500 ; avant de 539 − 30 = 509. Les 15 pièces des boîtes se regroupent en 3 lignes de la liste de découpe.

## R5. Placement des tiroirs

**Decision**: chaque tiroir, fond compris (hauteur des côtés + `f`), est centré verticalement sur sa façade, à ⌊(hauteur de la façade − hauteur des côtés − `f`) / 2⌋ du bas de la façade. En largeur, il commence à `e` + `c` ; en profondeur, il finit au ras de l'avant du caisson.

**Rationale**: dans l'exemple, le fond du tiroir du bas commence à 1,5 + 17,5 = 19 mm, au-dessus du dessous (18 mm). Un tiroir qui toucherait le dessous ou le dessus du caisson est refusé (R7), et le calcul des chevauchements existant le confirme dans les tests.

## R6. Noms des pièces

**Decision**: `Façade k`, `Tiroir k côté gauche`, `Tiroir k côté droit`, `Tiroir k avant`, `Tiroir k arrière`, `Tiroir k fond`, numérotés de haut en bas comme les façades.

**Rationale**: FR-008. Un même numéro relie une façade et son tiroir.

## R7. Refus

**Decision**: dans l'ordre, avec un message et la limite quand elle existe :

1. dimensions et épaisseurs invalides, comme pour le caisson ;
2. nombre de tiroirs hors de 1 à 10 ;
3. jeux hors limites ;
4. hauteur des côtés inférieure à 50 mm : le message donne le nombre maximal de tiroirs ;
5. profondeur de boîte inférieure à 250 mm : le message donne la profondeur minimale du meuble ;
6. avant et arrière sans longueur ;
7. tiroir du haut ou du bas qui toucherait le dessus ou le dessous.

**Rationale**: FR-009 et les cas limites de la spec. Le nombre maximal de tiroirs se calcule : le plus grand `n` pour lequel la hauteur commune moins 40 mm atteint 50 mm.

## R8. Chants

**Decision**: avec l'option `frontEdges`, le bord avant des côtés, du dessus et du dessous (bord `top`, comme le caisson) et les 4 bords de chaque façade reçoivent un chant.

**Rationale**: FR-011. Une façade en applique est visible sur ses quatre chants.

## R9. Formulaire

**Decision**: le panneau de gauche devient un formulaire de meuble : un sélecteur `Modèle` (Caisson, Meuble à tiroirs), puis les champs du modèle choisi. Les réglages des tiroirs (jeux et épaisseurs) sont dans une section repliée. Changer de modèle sur un projet qui a déjà des pièces demande toujours confirmation, puisque tout le meuble est remplacé.

**Rationale**: FR-002, FR-003 et FR-010. Les champs du caisson sont extraits sans changement, pour que le caisson reste identique.

## R10. Fichier

**Decision**: version 5, sans changement des données existantes : la migration depuis la version 4 est l'identité. Le modèle `drawers` écrit ses réglages dans l'ordre de `data-model.md`.

**Rationale**: une version 4 du logiciel refuserait sinon un fichier contenant un meuble à tiroirs comme « abîmé », alors que la spec demande le message « version plus récente ».
