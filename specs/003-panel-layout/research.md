# Research: Calepinage des panneaux

Aucune question technique ne restait ouverte après la spécification. Les décisions ci-dessous ont été vérifiées avec un prototype jetable, non conservé dans le dépôt.

## R1. Algorithme de placement

**Decision**: un placement glouton dans des rectangles libres, chaque pièce posée étant séparée du reste par deux coupes traversantes. On essaie toutes les combinaisons de 6 tris, 3 critères de choix du rectangle, 6 règles de coupe et 2 façons de parcourir les panneaux. On reprend ensuite le meilleur résultat : les pièces du panneau le moins rempli passent en tête, et une coupe sur sept environ est tirée au sort.

**Rationale**: le découpage en rectangles libres donne par construction des coupes traversantes, donc l'ordre des coupes (FR-016) est un simple parcours de l'arbre des coupes. Le trait de scie s'y intègre sans cas particulier. Le score est celui de FR-009 : pièces non placées, puis nombre de panneaux, puis plus grande chute.

**Résultats du prototype** (panneaux de 2800 × 2070 et 2500 × 1250 mm, trait de 3 mm) :

| Mesure | Résultat |
|---|---|
| Exemples calculés à la main de la spec | Tous exacts : 1, 2 et 4 panneaux |
| 56 meubles réalistes (cuisines, bibliothèques, dressings, tiroirs ; jusqu'à 20 caissons), comparés à une recherche 20 fois plus longue | 91 % égaux, jamais plus d'un panneau d'écart |
| Essais gloutons seuls, sans la reprise, sur 168 meubles | 49 % à la borne de surface, 16 % à plus d'un panneau de cette borne, qui n'est pas toujours atteignable |
| Placements invalides | Aucun, sur plusieurs centaines de résultats contrôlés |
| Temps maximal | 322 ms sur les meubles, 162 ms sur 200 pièces toutes différentes |

**Limite assumée**: quand les pièces remplissent un panneau presque sans jeu (découpes parfaites construites exprès), le logiciel utilise souvent un panneau de plus : 12 réussites sur 30 pour 9 pièces sur 1 panneau, aucune sur 2 panneaux. Les meubles réels ont généralement plus de jeu, mais le cas peut arriver. C'est pourquoi FR-009 interdit de présenter le nombre comme un minimum garanti. SC-002 se mesure sur des meubles réalistes, pas sur ces cas construits.

**Alternatives considered**: placement en bandes seul, plus simple mais moins économe ; recherche exacte, inutilisable au-delà d'une dizaine de pièces ; bibliothèque d'optimisation, écartée par le principe VI pour un gain non démontré.

## R2. Résultat reproductible

**Decision**: un générateur pseudo-aléatoire à graine fixe, et un nombre d'essais qui ne dépend que du nombre de pièces, jamais du temps écoulé. Les égalités de tri se départagent par l'ordre des pièces dans le projet.

**Rationale**: FR-011 exige le même placement pour les mêmes données. Une limite en temps donnerait un résultat différent selon la machine.

## R3. Budget de calcul

**Decision**: un budget global de 30 000 placements en plus des essais systématiques, réparti entre tous les matériaux : `essais = min(4000, 30000 / nombre total de pièces)`.

**Rationale**: dans le prototype, doubler ce budget ne change presque pas la qualité (51 puis 52 cas sur 56), et le temps reste très inférieur à l'objectif. Un budget global garantit que plusieurs matériaux n'allongent pas le calcul.

## R4. Calcul dans le fil de l'interface

**Decision**: un calcul synchrone, mémorisé tant que le projet ne change pas, exécuté seulement lorsque la vue de calepinage est ouverte.

**Rationale**: à environ 350 ms au pire, un processus séparé ajouterait une gestion d'états périmés et une règle de sécurité pour un gain faible (principe VI). La mesure de SC-005 dans la vraie application valide ce choix. Si elle échoue, ce sera un point à reprendre.

**Alternatives considered**: `Worker` avec résultats périmés abandonnés ; calcul découpé entre les images.

## R5. Représentation du résultat

**Decision**: `guillotine.ts` construit un arbre de coupes. `layout.ts` le met à plat en placements, chutes et coupes numérotées, dans l'ordre d'un parcours préfixe. Chaque coupe porte sa distance au bord du morceau en cours, la seule valeur à reporter sur le guide de la scie.

**Rationale**: un dessin seul oblige à calculer des différences à l'atelier. Le test de FR-016 rejoue les coupes une à une, à partir de cette liste seule, et vérifie qu'il obtient exactement les pièces et les chutes annoncées.

## R6. Bords et trait de scie

**Decision**: un trait de scie n'est compté qu'entre deux morceaux. Si le reste après une pièce est inférieur ou égal au trait, il n'y a pas de chute. Avec une marge de bord, quatre coupes de délignage passent en tête, leur trait étant du côté de la marge.

**Rationale**: FR-007 et les cas limites sur les ajustements exacts.

## R7. Enregistrement des réglages

**Decision**: un champ `layout` dans `Project`, donc dans l'historique d'annulation sans code particulier, et un format version 3. Seuls les panneaux modifiés sont enregistrés ; les autres utilisent la valeur par défaut. Une entrée dont le matériau n'est plus utilisé est conservée.

**Rationale**: revenir à un ancien nom de matériau retrouve ses réglages. Les fichiers des versions 1 et 2 reçoivent les réglages par défaut par migration.

**Alternatives considered**: préférences de l'application, écartées car le trait de scie et les panneaux doivent suivre le projet (FR-004).

## R8. Regroupement par matériau

**Decision**: la même clé que les totaux : épaisseur, et matériau sans espaces autour ni différence de casse, via `materialKey`, exporté par `cutList.ts`.

**Rationale**: FR-001. Le résumé du calepinage et les totaux ne peuvent pas diverger.

## R9. Sens du fil

**Decision**: la longueur d'un panneau suit le fil. Avec le réglage activé, `shape.length` suit la longueur du panneau, sans passer par la normalisation de la liste de découpe, qui affiche toujours la plus grande cote comme longueur.

**Rationale**: l'utilisateur fait une exception en inversant longueur et largeur de la pièce, comme le prévoit la spec. Le calepinage travaille donc sur les pièces, jamais sur les lignes de la liste, qui ne distinguent pas 1000 × 500 de 500 × 1000.

## R10. Taux d'utilisation

**Decision**: la surface des pièces divisée par la surface complète des panneaux, marge comprise, arrondie à la décimale inférieure.

**Rationale**: l'exemple de la spec donne 100 %, et un arrondi au plus proche pourrait annoncer 100 % pour un panneau qui ne l'est pas.

## R11. Emplacement de la vue

**Decision**: une bascule « Vue 3D / Calepinage » dans la barre d'outils. Le calepinage recouvre la zone centrale, et la vue 3D reste montée dessous. Les panneaux latéraux restent accessibles.

**Rationale**: un dessin de panneau a besoin de place, et FR-012 demande de voir le résultat changer pendant qu'on modifie une pièce. Détruire et recréer la vue 3D ferait perdre le cadrage et coûterait du temps.

## R12. Plan de coupe en PDF

**Decision**: le même mécanisme que le rapport actuel : une vue d'impression affichée le temps de l'export, avec une variante de contenu dans `ReportContent`, et un document séparé.

**Rationale**: FR-018 impose de ne pas toucher au PDF existant. Les tailles de texte sont fixées en millimètres de papier, comme pour les plans de forme, et chaque pièce trop petite pour son nom reçoit un numéro renvoyant à une légende. Un tableau reprend l'ordre et les distances des coupes.
