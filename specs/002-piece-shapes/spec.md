# Feature Specification: Pièces de forme : arrondis et découpes

**Feature Branch**: `claude/furniture-3d-modeling-app-ca615b`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Permettre de modifier la forme des pièces, au-delà des panneaux rectangulaires : par exemple faire des arrondis ou des découpes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrondir les coins d'une pièce (Priority: P1)

L'utilisateur sélectionne une pièce et transforme chacun de ses quatre coins : coin droit, arrondi d'un rayon donné, ou chanfrein d'une longueur donnée. Il voit le résultat sur la pièce et sur le meuble en 3D.

**Why this priority**: C'est la modification la plus courante (tablette aux angles adoucis, plateau de table) et la première citée dans la demande. À elle seule, elle sort déjà le logiciel du tout-rectangulaire.

**Independent Test**: Arrondir deux coins d'une tablette de 800 × 300 × 18 mm et vérifier la forme affichée, la cote relue dans le logiciel et la liste de découpe.

**Acceptance Scenarios**:

1. **Given** une pièce de 800 × 300 × 18 mm, **When** l'utilisateur arrondit ses deux coins avant avec un rayon de 40 mm, **Then** ces deux coins apparaissent arrondis dans la vue 3D et les deux autres restent droits.
2. **Given** cette pièce arrondie, **When** l'utilisateur consulte la liste de découpe, **Then** elle indique toujours 800 × 300 × 18 mm, le rectangle de bois nécessaire, et signale que la pièce a une forme particulière.
3. **Given** une pièce de 800 × 300 mm, **When** l'utilisateur demande un rayon de 200 mm sur deux coins voisins du petit côté, **Then** le logiciel refuse, explique le rayon maximal possible et laisse la pièce inchangée.
4. **Given** un coin arrondi, **When** l'utilisateur annule, **Then** la pièce revient exactement à sa forme précédente.

---

### User Story 2 - Faire des découpes dans une pièce (Priority: P1)

L'utilisateur ajoute des découpes à une pièce : une encoche qui entame un bord ou un coin, ou un trou rond ou rectangulaire à l'intérieur. Il les place en donnant leurs cotes et leur distance aux bords de la pièce.

**Why this priority**: C'est la seconde demande explicite, et elle répond à des besoins concrets : encoche autour d'un montant, passage de câbles, poignée.

**Independent Test**: Faire une encoche de 50 × 30 mm dans un coin d'une tablette et un trou de 60 mm de diamètre au milieu, puis vérifier la forme et les cotes relues.

**Acceptance Scenarios**:

1. **Given** une tablette, **When** l'utilisateur ajoute une encoche de 50 × 30 mm dans un coin, **Then** la vue 3D montre le coin entaillé et les cotes de l'encoche sont relues à l'identique.
2. **Given** une tablette, **When** l'utilisateur ajoute un trou rond de 60 mm de diamètre à 150 mm du bord gauche et 150 mm du bord bas, **Then** le trou traverse la pièce à cet endroit, et l'on voit à travers dans la vue 3D.
3. **Given** une découpe rectangulaire, **When** l'utilisateur lui donne un rayon d'angle de 5 mm, **Then** ses quatre angles sont arrondis de ce rayon, comme ceux que laisse une défonceuse.
4. **Given** une découpe qui dépasserait de la pièce ou en chevaucherait une autre, **When** l'utilisateur la valide, **Then** le logiciel refuse, explique pourquoi et laisse la pièce inchangée.
5. **Given** une pièce avec une découpe, **When** l'utilisateur supprime cette découpe, **Then** la pièce retrouve sa forme sans elle.
6. **Given** une planche qui traverse exactement l'encoche d'une autre, **When** le meuble est affiché, **Then** aucun chevauchement n'est signalé entre elles.
7. **Given** une découpe sur l'aperçu à plat, **When** l'utilisateur la fait glisser à la souris, **Then** elle se déplace au millimètre près, ses cotes de position se mettent à jour dans les champs, et le logiciel l'empêche de dépasser de la pièce.

---

### User Story 3 - Savoir comment fabriquer une pièce de forme (Priority: P1)

L'utilisateur exporte sa liste de découpe. Pour chaque forme particulière, il dispose d'un plan coté montrant les arrondis et les découpes, qu'il peut suivre à l'atelier.

**Why this priority**: Sans ce plan, la liste de découpe indique seulement un rectangle, et l'utilisateur ne peut pas fabriquer la pièce qu'il a dessinée. La fonctionnalité n'a de valeur que si elle aboutit à l'atelier.

**Independent Test**: Exporter un meuble contenant une pièce arrondie et percée, et reproduire la pièce à partir du seul PDF.

**Acceptance Scenarios**:

1. **Given** un meuble avec des pièces de forme, **When** l'utilisateur exporte en PDF, **Then** chaque forme distincte a un plan coté : dimensions de la pièce, rayons, chanfreins, cotes des découpes et leur distance aux bords.
2. **Given** deux pièces de même forme, **When** l'utilisateur consulte la liste, **Then** elles sont regroupées sur une seule ligne, et un seul plan est produit, avec leur quantité.
3. **Given** deux pièces de mêmes dimensions mais de formes différentes, **When** l'utilisateur consulte la liste, **Then** elles sont sur deux lignes distinctes.
4. **Given** une pièce de forme, **When** l'utilisateur exporte en CSV, **Then** une colonne indique que la pièce a une forme particulière et renvoie à son plan.
5. **Given** un meuble sans aucune pièce de forme, **When** l'utilisateur exporte en PDF, **Then** le document est identique à celui d'aujourd'hui.

---

### User Story 4 - Réutiliser une forme (Priority: P3)

L'utilisateur applique la même forme à plusieurs pièces en une seule fois, ou reprend la forme d'une pièce sur une autre.

**Why this priority**: Fait gagner du temps sur les meubles répétitifs, mais chaque pièce peut être modifiée séparément en attendant.

**Independent Test**: Sélectionner les 3 étagères d'un caisson, arrondir leurs coins avant en une seule action et vérifier qu'elles restent regroupées dans la liste.

**Acceptance Scenarios**:

1. **Given** plusieurs pièces sélectionnées de mêmes dimensions, **When** l'utilisateur leur applique un arrondi, **Then** toutes le reçoivent en une seule action annulable.
2. **Given** des pièces sélectionnées de dimensions différentes, **When** une modification ne convient pas à l'une d'elles, **Then** aucune n'est modifiée et le logiciel indique laquelle pose problème.

---

### Edge Cases

- **Rayon ou chanfrein trop grand** : refusé, avec la valeur maximale possible, en tenant compte du coin voisin sur le même côté.
- **Découpe qui coupe la pièce en deux** : refusée, la pièce doit rester d'un seul tenant.
- **Découpes qui se touchent ou se chevauchent, ou qui mordent sur un arrondi** : refusées.
- **Changement de longueur ou de largeur d'une pièce de forme** : les découpes gardent leur distance aux bords de référence ; si elles ne tiennent plus, le changement est refusé avec une explication.
- **Rotation, duplication, copier-coller d'une pièce de forme** : la forme suit la pièce sans changer de cotes.
- **Deux pièces identiques, l'une tournée ou retournée** : même découpe, donc même ligne et même plan.
- **Régénération d'un caisson dont une pièce a une forme** : même confirmation que pour toute retouche, et les formes sont perdues si l'utilisateur confirme.
- **Clic à travers un trou dans la vue 3D** : sélectionne la pièce située derrière.
- **Projet créé avant cette fonctionnalité** : s'ouvre à l'identique, ses pièces restent rectangulaires.
- **Projet contenant des formes, ouvert par une version plus ancienne du logiciel** : refusé avec le message existant, sans ouverture partielle.

## Requirements *(mandatory)*

### Functional Requirements

**Coins**

- **FR-001**: Chaque coin d'une pièce DOIT pouvoir être droit, arrondi d'un rayon donné, ou chanfreiné à 45° d'une longueur donnée, indépendamment des trois autres.
- **FR-002**: Le logiciel DOIT refuser, avec une explication et la valeur maximale possible, un rayon ou un chanfrein qui ne tient pas sur les côtés de la pièce, compte tenu des coins voisins.

**Découpes**

- **FR-003**: Les utilisateurs DOIVENT pouvoir ajouter à une pièce des encoches rectangulaires entamant un bord ou un coin, des trous rectangulaires et des trous ronds, les modifier et les supprimer.
- **FR-004**: Chaque découpe DOIT être définie par ses cotes et par sa distance à deux bords de la pièce choisis par l'utilisateur. Les angles d'une découpe rectangulaire DOIVENT pouvoir recevoir un rayon.
- **FR-005**: Le logiciel DOIT refuser, avec une explication, toute découpe qui dépasse de la pièce, en chevauche ou en touche une autre, mord sur un coin modifié, ou sépare la pièce en plusieurs morceaux.
- **FR-006**: Une même pièce DOIT accepter au moins 20 découpes.
- **FR-007**: Les formes DOIVENT se limiter aux arrondis, chanfreins, encoches et trous définis par des cotes. Le dessin libre d'un contour n'est pas pris en charge.
- **FR-008**: Toutes les formes DOIVENT traverser la pièce sur toute son épaisseur. Les usinages partiels (rainures, feuillures, lamages) et les chants arrondis ne sont pas pris en charge.

**Modification**

- **FR-009**: La forme d'une pièce sélectionnée DOIT se modifier par des champs de cotes accompagnés d'un aperçu à plat de la pièce. Les découpes et les rayons DOIVENT aussi pouvoir être ajustés à la souris sur cet aperçu, au millimètre près, les champs affichant aussitôt les cotes obtenues. La vue 3D ne sert pas à modifier la forme.
- **FR-010**: Toute modification de forme DOIT être annulable et rétablissable, et compter comme une retouche d'un caisson généré.
- **FR-011**: Les utilisateurs DOIVENT pouvoir appliquer une modification de forme à plusieurs pièces sélectionnées en une seule action ; si elle ne convient pas à l'une d'elles, aucune n'est modifiée.
- **FR-012**: La forme DOIT accompagner la pièce lors d'une rotation, d'une duplication ou d'un copier-coller, sans changement de cotes.
- **FR-013**: Lorsque la longueur ou la largeur d'une pièce de forme change, chaque découpe DOIT garder sa distance à ses bords de référence ; si la forme ne tient plus, le changement DOIT être refusé avec une explication.

**Vue 3D et assemblage**

- **FR-014**: La vue 3D DOIT montrer la forme réelle des pièces, y compris à travers les trous et dans les encoches, et un clic DOIT sélectionner ce qui est réellement visible à cet endroit.
- **FR-015**: Le signalement des chevauchements DOIT tenir compte de la forme réelle : une pièce logée dans l'encoche ou le trou d'une autre n'est pas en chevauchement.

**Liste de découpe et exports**

- **FR-016**: La liste de découpe DOIT indiquer pour chaque pièce le rectangle de bois nécessaire et signaler les pièces de forme.
- **FR-017**: Le logiciel DOIT regrouper sur une même ligne les pièces de mêmes dimensions, épaisseur, matériau et forme, y compris lorsque l'une est tournée ou retournée par rapport à l'autre, et séparer celles dont la forme diffère.
- **FR-018**: Les totaux de surface DOIVENT rester calculés sur le rectangle de bois nécessaire.
- **FR-019**: Le PDF DOIT contenir un plan coté par forme distincte, avec sa quantité, et indiquer à quelle ligne de la liste il correspond. Chaque cote nécessaire à la fabrication DOIT y figurer.
- **FR-020**: Le CSV DOIT indiquer, pour chaque ligne, si elle correspond à une forme particulière et le numéro de son plan.
- **FR-021**: Toutes les cotes saisies d'une forme DOIVENT être exactes à 0,1 mm, conservées à l'identique à l'enregistrement et restituées sur les plans.

**Compatibilité**

- **FR-022**: Les projets enregistrés avec une version antérieure DOIVENT s'ouvrir à l'identique, et leurs pièces rester rectangulaires.
- **FR-023**: Un meuble sans aucune pièce de forme DOIT produire la même liste de découpe et les mêmes exports qu'aujourd'hui.

### Key Entities *(include if feature involves data)*

- **Forme de pièce**: Ce qui distingue une pièce d'un simple rectangle : le traitement de ses quatre coins et ses découpes. Elle est retranchée du rectangle de la pièce, qu'elle ne dépasse jamais.
- **Traitement de coin**: Pour un coin donné : droit, arrondi avec son rayon, ou chanfrein avec sa longueur.
- **Découpe**: Une encoche, un trou rectangulaire ou un trou rond, avec ses cotes, son éventuel rayon d'angle et sa position par rapport à deux bords de référence.
- **Ligne de découpe**: Étendue pour distinguer les formes : deux pièces ne sont regroupées que si leur forme est la même, à une rotation ou un retournement près.
- **Plan de forme**: Le dessin coté d'une forme distincte dans le PDF, avec sa quantité et sa correspondance à une ligne de la liste. Il est calculé, jamais saisi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur arrondit deux coins et ajoute une découpe à une pièce en moins de 1 minute, sans documentation.
- **SC-002**: Sur un jeu de pièces de référence, 100 % des cotes de formes relues dans le logiciel, le fichier enregistré et le PDF sont exactes à 0,1 mm.
- **SC-003**: Une personne fabrique une pièce arrondie et percée à partir du seul PDF imprimé, sans revenir au logiciel.
- **SC-004**: Après une modification de forme, la vue 3D et la liste sont à jour en moins de 1 seconde, sur un meuble de 200 pièces dont 50 ont une forme.
- **SC-005**: La rotation de la vue reste fluide sur ce même meuble, sur un portable à carte graphique intégrée.
- **SC-006**: 100 % des projets enregistrés avant cette fonctionnalité s'ouvrent avec une liste de découpe identique.
- **SC-007**: 100 % des formes impossibles du jeu d'essai sont refusées avec une explication, sans modifier la pièce.

## Assumptions

- Les formes sont retirées du rectangle de la pièce : le rectangle de bois nécessaire reste sa longueur par sa largeur, et une pièce n'a jamais de partie qui dépasse.
- Les courbes sont des arcs de cercle, et les chanfreins sont à 45°.
- La solidité de la pièce n'est pas évaluée : une paroi très fine reste autorisée si elle laisse la pièce d'un seul tenant.
- Les outils et leur diamètre ne sont pas gérés : le rayon d'angle d'une découpe est saisi par l'utilisateur.
- L'alignement à la souris continue de se faire sur les faces de l'encombrement rectangulaire des pièces.
- Le modèle de caisson ne génère pas de formes : elles s'ajoutent ensuite sur ses pièces.
- Le dessin libre d'un contour, les usinages partiels et les chants arrondis sont hors périmètre de cette spécification, et pourront faire l'objet d'une spécification ultérieure.
- L'export vers des machines à commande numérique et le calepinage sont hors périmètre.
- Les fonctionnalités de la première version, ainsi que ses limites de dimensions et sa précision de 0,1 mm, restent inchangées.
