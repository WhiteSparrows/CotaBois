# Feature Specification: Calepinage des panneaux

**Feature Branch**: `claude/furniture-3d-modeling-app-ca615b`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Calepinage : à partir de la liste de découpe d'un meuble et des dimensions des panneaux bruts disponibles, placer les pièces sur les panneaux, indiquer combien de panneaux acheter et produire un plan de coupe, en tenant compte de la largeur du trait de scie. Les pièces de forme occupent dans un premier temps leur rectangle complet."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Savoir combien de panneaux acheter (Priority: P1)

L'utilisateur indique la taille des panneaux qu'il peut acheter et la largeur du trait de scie. Le logiciel lui dit combien de panneaux il lui faut pour chaque matériau et chaque épaisseur, et quelle part du bois sera utilisée.

**Why this priority**: C'est la question qui se pose avant d'aller acheter le bois, et aujourd'hui les totaux de surface n'y répondent pas : une surface suffisante ne garantit pas que les pièces rentrent.

**Independent Test**: Sur un meuble dont le résultat a été calculé à la main, saisir la taille des panneaux et vérifier le nombre annoncé pour chaque matériau et chaque épaisseur.

**Acceptance Scenarios**:

1. **Given** 4 pièces de 1000 × 500 × 18 mm, sans trait de scie, et des panneaux de 2000 × 1000 mm, **When** l'utilisateur ouvre le calepinage, **Then** le logiciel annonce 1 panneau, utilisé à 100 %.
2. **Given** ces mêmes pièces et un trait de scie de 3 mm, **When** le calepinage se calcule, **Then** le logiciel annonce 2 panneaux, car deux pièces côte à côte dépassent désormais le panneau de 3 mm.
3. **Given** un meuble avec du 18 mm et du 5 mm, **When** l'utilisateur ouvre le calepinage, **Then** chaque matériau et chaque épaisseur ont leur propre résultat et leur propre taille de panneau.
4. **Given** une pièce de 3000 × 500 mm et des panneaux de 2800 × 2070 mm, **When** le calepinage se calcule, **Then** le logiciel nomme la pièce qui ne rentre pas, place toutes les autres, et indique clairement que le résultat est incomplet.
5. **Given** un calepinage affiché, **When** l'utilisateur modifie une pièce du meuble, **Then** le résultat se met à jour sans autre action.

---

### User Story 2 - Voir où chaque pièce est placée (Priority: P1)

L'utilisateur voit chaque panneau dessiné à l'échelle, avec ses pièces identifiées et leurs cotes, ainsi que les chutes.

**Why this priority**: Un nombre seul ne permet pas de couper. Le dessin montre comment obtenir ce résultat, et permet de juger s'il convient.

**Independent Test**: Sur un meuble de référence, relever la position et les cotes de chaque pièce sur le dessin, et vérifier qu'aucune ne se chevauche et que toutes y figurent une seule fois.

**Acceptance Scenarios**:

1. **Given** un calepinage calculé, **When** l'utilisateur le consulte, **Then** chaque panneau est dessiné à l'échelle, et chaque pièce y porte son nom, ou un numéro renvoyant à une légende quand la place manque, ainsi que ses cotes.
2. **Given** deux pièces voisines sur un panneau, **When** l'utilisateur relève leurs positions, **Then** elles sont séparées d'au moins la largeur du trait de scie.
3. **Given** une pièce arrondie et percée, **When** elle est placée, **Then** elle occupe son rectangle complet, et le dessin indique qu'elle a un plan de forme.
4. **Given** plusieurs panneaux qui ont exactement le même placement, **When** l'utilisateur les consulte, **Then** ils sont présentés une seule fois, avec leur quantité.

---

### User Story 3 - Emporter le plan de coupe à l'atelier (Priority: P1)

L'utilisateur exporte un document avec la liste des panneaux à acheter et le dessin coté de chaque panneau, qu'il peut suivre devant sa scie.

**Why this priority**: Comme pour les pièces de forme, la fonctionnalité n'a de valeur que si elle aboutit à l'atelier.

**Independent Test**: Exporter le plan de coupe d'un meuble, l'imprimer, et vérifier qu'il suffit à découper tous les panneaux sans revenir au logiciel.

**Acceptance Scenarios**:

1. **Given** un calepinage complet, **When** l'utilisateur exporte le plan de coupe en PDF, **Then** le document indique les panneaux à acheter, les réglages utilisés, et un dessin coté par panneau.
2. **Given** un calepinage incomplet, **When** l'utilisateur l'exporte, **Then** le document indique en évidence les pièces non placées.
3. **Given** un panneau, **When** il est imprimé, **Then** son dessin n'est jamais coupé entre deux pages et ses cotes restent lisibles.
4. **Given** l'export existant de la liste de découpe, **When** l'utilisateur l'utilise, **Then** ce document ne change pas.

---

### User Story 4 - Suivre l'ordre des coupes (Priority: P2)

Sur chaque panneau, les coupes sont numérotées dans l'ordre où les faire.

**Why this priority**: Évite de se retrouver bloqué au milieu d'un panneau, mais un utilisateur expérimenté peut retrouver cet ordre à partir du dessin.

**Independent Test**: Suivre les numéros d'un panneau de référence et vérifier que chaque coupe va d'un bord à l'autre du morceau en cours, et que toutes les pièces sont obtenues.

**Acceptance Scenarios**:

1. **Given** un panneau calepiné, **When** l'utilisateur suit les numéros, **Then** chaque coupe sépare en deux le morceau en cours, d'un bord à l'autre.
2. **Given** toutes les coupes d'un panneau réalisées, **When** l'utilisateur vérifie les morceaux obtenus, **Then** il a exactement les pièces prévues et les chutes dessinées.

---

### User Story 5 - Respecter le sens du fil (Priority: P2)

Pour un matériau dont le décor ou le fil a un sens, l'utilisateur demande que les pièces ne soient pas tournées.

**Why this priority**: Indispensable pour les placages et les décors bois, sans objet pour un MDF ou un mélaminé uni.

**Independent Test**: Calculer le même meuble avec et sans respect du fil, et vérifier le placement et le nombre de panneaux sur un exemple calculé à la main.

**Acceptance Scenarios**:

1. **Given** 4 pièces de 1000 × 500 mm, un trait de scie de 3 mm, des panneaux de 2000 × 1000 mm et un matériau sans sens de fil, **When** le calepinage se calcule, **Then** il annonce 2 panneaux, en tournant des pièces.
2. **Given** ces mêmes pièces et un matériau avec sens de fil, **When** le calepinage se calcule, **Then** il annonce 4 panneaux, et la longueur de chaque pièce suit la longueur du panneau.

---

### Edge Cases

- **Pièce plus grande que le panneau** : nommée dans un avertissement ; les autres sont placées et le résultat est indiqué comme incomplet.
- **Sens du fil activé et pièce qui ne rentrerait que tournée** : nommée dans l'avertissement, qui indique qu'elle rentrerait sans le sens du fil, ou en inversant sa longueur et sa largeur.
- **Pièce exactement aux dimensions utiles du panneau** : acceptée, aucun trait de scie n'est compté contre un bord.
- **Somme de pièces et de traits de scie égale exactement au panneau** : acceptée.
- **Marge de bord trop grande pour laisser une surface utile** : refusée avec une explication.
- **Taille de panneau, trait de scie ou marge impossibles** : refusés avec une explication, sans changer le résultat affiché.
- **Meuble sans pièce** : le calepinage l'indique, sans panneau ni erreur ; l'export est indisponible.
- **Matériau renommé ou épaisseur changée** : le groupe correspondant reçoit la taille de panneau par défaut s'il n'en a pas encore.
- **Découpes d'une pièce de forme** : leur surface n'est pas réutilisée pour y placer d'autres pièces.
- **Projet créé avant cette fonctionnalité** : s'ouvre à l'identique, avec les réglages par défaut.
- **Projet contenant des réglages de calepinage, ouvert par une version plus ancienne du logiciel** : refusé avec le message existant, sans ouverture partielle.

## Requirements *(mandatory)*

### Functional Requirements

**Panneaux et réglages**

- **FR-001**: Le calepinage DOIT traiter séparément chaque combinaison de matériau et d'épaisseur présente dans la liste de découpe, selon le même regroupement que les totaux existants.
- **FR-002**: Chaque combinaison DOIT disposer d'une seule taille de panneau, réglable par l'utilisateur et en quantité illimitée. Plusieurs tailles pour une même combinaison, les stocks et la réutilisation des chutes ne sont pas pris en charge.
- **FR-003**: Les utilisateurs DOIVENT pouvoir régler la largeur du trait de scie, de 0 à 20 mm, valeur par défaut 3 mm, et une marge de bord retirée sur les quatre côtés du panneau, de 0 à 100 mm, valeur par défaut 0.
- **FR-004**: Toute valeur impossible DOIT être refusée avec une explication. Les réglages DOIVENT être exacts à 0,1 mm, annulables et enregistrés avec le projet, sans compter comme une retouche d'un caisson généré.

**Placement**

- **FR-005**: Le placement DOIT n'utiliser que des coupes traversantes, réalisables à la scie : chaque coupe va d'un bord à l'autre du morceau en cours et le sépare en deux. Le placement libre n'est pas pris en charge.
- **FR-006**: Chaque combinaison DOIT avoir un réglage de sens du fil, désactivé par défaut. Désactivé, les pièces peuvent être tournées d'un quart de tour. Activé, la longueur de chaque pièce DOIT suivre la longueur du panneau, et aucune pièce n'est tournée.
- **FR-007**: Chaque pièce placée DOIT apparaître exactement une fois, entièrement dans la surface utile de son panneau, sans chevaucher une autre pièce, et séparée de ses voisines par au moins le trait de scie. Aucun trait de scie n'est compté entre une pièce et le bord de la surface utile.
- **FR-008**: Les pièces de forme DOIVENT occuper leur rectangle complet, et la surface de leurs découpes NE DOIT PAS être réutilisée.
- **FR-009**: Le logiciel DOIT viser le plus petit nombre de panneaux possible, puis la plus grande chute d'un seul tenant, sans présenter le résultat comme un minimum garanti.
- **FR-010**: Une pièce qui ne rentre sur aucun panneau DOIT être nommée dans un avertissement, les autres étant placées, et le résultat DOIT être indiqué comme incomplet.
- **FR-011**: Un même meuble avec les mêmes réglages DOIT toujours donner le même placement.
- **FR-012**: Le calepinage DOIT être calculé à partir des pièces du meuble, jamais saisi, et suivre toute modification sans action de synchronisation. Le placement n'est pas modifiable à la main.

**Résultats**

- **FR-013**: Le logiciel DOIT afficher, pour chaque matériau et épaisseur, le nombre de panneaux, leur taille, le taux d'utilisation du bois et le nombre de pièces placées.
- **FR-014**: Chaque panneau DOIT être dessiné à l'échelle, avec ses pièces identifiées, leurs cotes, et les chutes. Les panneaux au placement identique DOIVENT être regroupés avec leur quantité.
- **FR-015**: Une pièce de forme DOIT être signalée sur le dessin, avec le numéro de son plan de forme.
- **FR-016**: Chaque panneau DOIT indiquer l'ordre des coupes.
- **FR-017**: Les utilisateurs DOIVENT pouvoir exporter un plan de coupe en PDF, contenant les panneaux à acheter, les réglages utilisés, les avertissements et un dessin coté par panneau, jamais coupé entre deux pages.
- **FR-018**: L'export existant de la liste de découpe en PDF et en CSV NE DOIT PAS changer.
- **FR-019**: Toutes les cotes affichées et exportées DOIVENT être exactes à 0,1 mm.

**Compatibilité**

- **FR-020**: Les projets enregistrés avec une version antérieure DOIVENT s'ouvrir à l'identique, avec les réglages par défaut.

### Key Entities *(include if feature involves data)*

- **Réglages de calepinage**: Enregistrés avec le projet : le trait de scie, la marge de bord, et le panneau de chaque matériau et épaisseur.
- **Panneau disponible**: La longueur et la largeur d'un panneau brut, pour un matériau et une épaisseur, et le respect ou non du sens du fil.
- **Calepinage**: Le résultat calculé pour un meuble et ses réglages : les panneaux utilisés et les pièces non placées. Il n'est jamais enregistré.
- **Panneau calepiné**: Un panneau avec ses pièces placées, leur position, leurs éventuelles rotations, ses chutes et l'ordre de ses coupes.
- **Plan de coupe**: Le document imprimable tiré d'un calepinage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: À partir d'un meuble terminé, un utilisateur obtient le nombre de panneaux à acheter en moins de 1 minute, sans documentation.
- **SC-002**: Sur un jeu de meubles réalistes dont le meilleur résultat connu vient d'un calcul à la main ou d'une recherche beaucoup plus longue, le logiciel atteint ce nombre de panneaux dans au moins 90 % des cas, et ne le dépasse jamais de plus d'un panneau.
- **SC-003**: Sur 100 % des cas du jeu d'essai, chaque pièce apparaît une seule fois, sans chevauchement, dans la surface utile, et à la distance de trait de scie demandée, avec des cotes exactes à 0,1 mm.
- **SC-004**: Une personne découpe tous les panneaux d'un meuble à partir du seul plan de coupe imprimé, sans revenir au logiciel.
- **SC-005**: Le calepinage d'un meuble de 200 pièces s'affiche en moins de 2 secondes, sur un portable à carte graphique intégrée, sans bloquer l'interface plus longtemps.
- **SC-006**: 100 % des projets enregistrés avant cette fonctionnalité s'ouvrent avec une liste de découpe identique.

## Assumptions

- La taille de panneau proposée par défaut est de 2800 × 2070 mm ; elle est affichée avec le résultat, et l'utilisateur la remplace par celle de son fournisseur.
- Un panneau neuf a ses quatre bords exploitables, sauf marge de bord réglée par l'utilisateur.
- Le fil d'un panneau suit sa longueur, et celui d'une pièce suit la cote saisie comme sa longueur. Pour faire une exception, l'utilisateur inverse la longueur et la largeur de la pièce.
- Le calepinage porte sur un seul meuble, celui du projet ouvert.
- Le matériau est reconnu comme dans les totaux existants, sans tenir compte des majuscules ni des espaces autour : deux orthographes différentes forment deux groupes.
- Le prix des panneaux, les chants, l'imbrication des contours réels et l'export vers des machines à commande numérique sont hors périmètre, et pourront faire l'objet d'une spécification ultérieure.
- Le calepinage ne dépend d'aucun service en ligne, comme le reste du logiciel.
- Les fonctionnalités des versions précédentes, leurs limites de dimensions et leur précision de 0,1 mm restent inchangées.
