# Feature Specification: Conception de meubles et liste de découpe

**Feature Branch**: `claude/furniture-3d-modeling-app-ca615b`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Un vrai logiciel qui se lance en cliquant sur une icône. On entre les dimensions d'un meuble, on le dessine en 3D, et le logiciel donne les découpes de bois et les différentes pièces nécessaires pour le fabriquer. Usage en local uniquement."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Des dimensions à la liste de découpe (Priority: P1)

L'utilisateur crée un nouveau meuble à partir d'un caisson. Il saisit la largeur, la hauteur et la profondeur hors tout, l'épaisseur du bois, l'épaisseur du fond et le nombre d'étagères. Le logiciel affiche aussitôt le meuble en 3D et la liste des pièces à découper.

**Why this priority**: C'est la raison d'être du logiciel. À elle seule, cette partie répond déjà à la question « que dois-je découper pour fabriquer ce meuble ? ».

**Independent Test**: Saisir les dimensions d'un caisson et comparer la liste de découpe obtenue à un calcul fait à la main.

**Acceptance Scenarios**:

1. **Given** un nouveau projet, **When** l'utilisateur saisit un caisson de 800 mm de large, 1800 mm de haut et 400 mm de profond, en bois de 18 mm, avec un fond de 5 mm et 3 étagères, **Then** la liste de découpe contient exactement : 2 côtés de 1800 × 395 × 18 mm, 5 pièces (dessus, dessous, 3 étagères) de 764 × 395 × 18 mm et 1 fond de 1800 × 800 × 5 mm.
2. **Given** ce même caisson, **When** la liste s'affiche, **Then** la vue 3D montre les 8 pièces à leur place et l'utilisateur peut tourner autour du meuble, zoomer et se déplacer.
3. **Given** un caisson affiché, **When** l'utilisateur change une dimension du caisson, **Then** la vue 3D et la liste de découpe se mettent à jour sans autre action de sa part.
4. **Given** un caisson avec une épaisseur de fond à 0, **When** la liste s'affiche, **Then** elle ne contient aucun fond et les autres pièces utilisent toute la profondeur.
5. **Given** le formulaire du caisson, **When** l'utilisateur saisit des dimensions impossibles (par exemple une largeur inférieure à deux épaisseurs de bois), **Then** le logiciel explique le problème et ne modifie pas le meuble affiché.

---

### User Story 2 - Installer et lancer d'un clic (Priority: P1)

L'utilisateur installe CotaBois avec un installeur. Une icône apparaît sur le bureau et dans le menu Démarrer. Un double-clic ouvre le logiciel, prêt à l'emploi, sans fenêtre technique ni étape préalable.

**Why this priority**: C'est une exigence de départ, au même titre que le calcul : le logiciel doit être un vrai logiciel, pas un projet à démarrer soi-même.

**Independent Test**: Sur un Windows sans outil de développement et sans connexion réseau, lancer l'installeur puis double-cliquer sur l'icône.

**Acceptance Scenarios**:

1. **Given** un ordinateur Windows sans outil de développement, **When** l'utilisateur exécute l'installeur, **Then** CotaBois s'installe sans demander d'installer autre chose et une icône est créée.
2. **Given** CotaBois installé, **When** l'utilisateur double-clique sur l'icône, **Then** la fenêtre du logiciel s'ouvre sans console ni autre fenêtre technique.
3. **Given** un ordinateur sans connexion réseau, **When** l'utilisateur lance CotaBois et l'utilise, **Then** toutes les fonctionnalités marchent normalement.
4. **Given** CotaBois installé, **When** l'utilisateur le désinstalle par la procédure standard de Windows, **Then** le logiciel est retiré et ses fichiers de projet sont conservés.

---

### User Story 3 - Ajuster le meuble en 3D (Priority: P2)

L'utilisateur modifie le meuble directement dans la vue 3D : il sélectionne une pièce, change ses cotes, la déplace, la fait pivoter, la duplique, la supprime, ou ajoute un nouveau panneau. Il peut aussi partir d'un projet vide et dessiner tout son meuble panneau par panneau. La liste de découpe suit chaque modification.

**Why this priority**: C'est ce qui permet de dépasser le simple caisson (tiroirs, séparations, plinthes, meubles sur mesure). Le logiciel apporte néanmoins déjà une valeur sans cela.

**Independent Test**: Partir d'un projet vide, construire une table simple avec un plateau et quatre pieds, et vérifier la liste de découpe obtenue.

**Acceptance Scenarios**:

1. **Given** un meuble affiché, **When** l'utilisateur clique sur une pièce, **Then** elle est mise en évidence et son nom, ses cotes, son matériau et sa position sont modifiables.
2. **Given** une pièce sélectionnée, **When** l'utilisateur change sa longueur, **Then** la vue 3D et la liste de découpe se mettent à jour sans autre action de sa part.
3. **Given** une pièce sélectionnée, **When** l'utilisateur la fait glisser près d'une autre pièce, **Then** elle s'aligne bord à bord avec celle-ci, sans laisser de jeu parasite dans les cotes.
4. **Given** une pièce sélectionnée, **When** l'utilisateur la fait pivoter d'un quart de tour, **Then** sa position change dans le meuble mais ses dimensions de découpe restent identiques.
5. **Given** une modification effectuée, **When** l'utilisateur demande d'annuler, **Then** le meuble revient exactement à son état précédent, et il peut rétablir la modification.
6. **Given** deux pièces qui se chevauchent, **When** elles sont affichées, **Then** le logiciel signale le chevauchement sans bloquer l'utilisateur.
7. **Given** un caisson déjà ajusté à la main, **When** l'utilisateur change les dimensions du caisson, **Then** le logiciel le prévient que ses ajustements seront perdus et lui permet d'annuler.

---

### User Story 4 - Enregistrer et reprendre un projet (Priority: P3)

L'utilisateur enregistre son meuble dans un fichier à l'emplacement de son choix, puis le rouvre plus tard pour le retrouver à l'identique.

**Why this priority**: Indispensable dès qu'un meuble demande plus d'une séance de travail, mais un meuble simple peut être conçu et découpé sans cela.

**Independent Test**: Enregistrer un meuble, fermer le logiciel, rouvrir le fichier et comparer le meuble et la liste de découpe.

**Acceptance Scenarios**:

1. **Given** un meuble en cours, **When** l'utilisateur l'enregistre, ferme le logiciel puis rouvre le fichier, **Then** toutes les pièces et la liste de découpe sont identiques.
2. **Given** des modifications non enregistrées, **When** l'utilisateur ferme le logiciel ou ouvre un autre projet, **Then** le logiciel lui propose d'enregistrer, d'abandonner les modifications ou d'annuler.
3. **Given** un fichier abîmé ou qui n'est pas un projet CotaBois, **When** l'utilisateur tente de l'ouvrir, **Then** un message clair s'affiche et le projet en cours n'est pas modifié.

---

### User Story 5 - Exporter la liste pour l'atelier (Priority: P3)

L'utilisateur exporte sa liste de découpe en PDF pour l'imprimer et l'emporter à l'atelier, ou en CSV pour la reprendre dans un tableur.

**Why this priority**: Rend la liste utilisable loin de l'écran. En attendant, la liste reste lisible et recopiable dans le logiciel.

**Independent Test**: Exporter un meuble en PDF et en CSV, puis vérifier que chaque document contient les mêmes lignes que la liste affichée.

**Acceptance Scenarios**:

1. **Given** un meuble avec des pièces, **When** l'utilisateur exporte en PDF, **Then** le document contient le nom du projet, la date, une image du meuble, la liste de découpe complète et les totaux, et il tient lisiblement sur des pages A4.
2. **Given** un meuble avec des pièces, **When** l'utilisateur exporte en CSV, **Then** le fichier s'ouvre dans un tableur avec une colonne par information, accents et décimales corrects.
3. **Given** un projet sans aucune pièce, **When** l'utilisateur regarde les exports, **Then** ils sont indisponibles et le logiciel indique pourquoi.

---

### Edge Cases

- **Valeur nulle, négative ou non numérique** : la saisie est refusée avec une explication et la dernière valeur valide est conservée.
- **Virgule ou point décimal** : `18,5` et `18.5` sont tous deux acceptés. Toute précision au-delà de 0,1 mm est refusée plutôt qu'arrondie en silence.
- **Trop d'étagères pour la hauteur intérieure** : le logiciel refuse et indique le nombre maximal possible.
- **Fond plus épais que la profondeur, ou épaisseur de bois plus grande que le caisson** : refusé avec une explication.
- **Pièces identiques mais orientées différemment** : elles sont regroupées sur la même ligne, car c'est la même découpe.
- **Pièces de mêmes dimensions mais de matériaux ou d'épaisseurs différents** : elles restent sur des lignes distinctes.
- **Suppression de la dernière pièce** : la vue 3D et la liste sont vides, avec une invitation à ajouter une pièce ou à créer un caisson.
- **Pièce déplacée loin du meuble** : elle reste comptée dans la liste de découpe, et l'utilisateur dispose d'une commande pour recadrer la vue sur tout le meuble.
- **Enregistrement impossible (disque plein, dossier protégé)** : un message clair s'affiche et le travail en cours reste ouvert.
- **Projet créé par une version plus récente de CotaBois** : le logiciel l'indique et ne tente pas de l'ouvrir partiellement.

## Requirements *(mandatory)*

### Functional Requirements

**Création du caisson**

- **FR-001**: Le logiciel DOIT permettre de créer un caisson à partir de sa largeur, de sa hauteur et de sa profondeur hors tout, de l'épaisseur du bois, de l'épaisseur du fond (0 si aucun fond) et du nombre d'étagères.
- **FR-002**: Le logiciel DOIT générer le caisson selon cette règle : deux côtés sur toute la hauteur ; dessus, dessous et étagères entre les côtés ; fond rapporté au dos, sur toute la largeur et toute la hauteur. Les dimensions hors tout saisies incluent le fond : les côtés, le dessus, le dessous et les étagères ont donc pour profondeur la profondeur hors tout moins l'épaisseur du fond.
- **FR-003**: Le logiciel DOIT répartir les étagères à intervalles égaux dans la hauteur intérieure.
- **FR-004**: Le logiciel DOIT refuser, avec une explication, toute dimension qui rendrait le meuble impossible, et laisser dans ce cas le meuble affiché inchangé.
- **FR-005**: Le logiciel DOIT permettre de démarrer d'un projet vide, sans caisson.

**Pièces et vue 3D**

- **FR-006**: Dans cette version, chaque pièce DOIT être un panneau rectangulaire défini par un nom, une longueur, une largeur, une épaisseur, un matériau facultatif, une position et une orientation.
- **FR-007**: Le logiciel DOIT afficher le meuble en 3D et permettre de tourner autour, de zoomer, de se déplacer et de recadrer la vue sur tout le meuble.
- **FR-008**: Le logiciel DOIT permettre de sélectionner une pièce dans la vue 3D et dans la liste, et de la voir mise en évidence dans les deux.
- **FR-009**: Les utilisateurs DOIVENT pouvoir ajouter, dupliquer et supprimer une pièce, et modifier son nom, ses cotes et son matériau.
- **FR-010**: Les utilisateurs DOIVENT pouvoir déplacer une pièce en la faisant glisser dans la vue 3D, ou en saisissant sa position exacte.
- **FR-011**: Lors d'un déplacement à la souris, la pièce DOIT s'aligner sur les faces et les bords des pièces voisines lorsqu'elle s'en approche.
- **FR-012**: Les utilisateurs DOIVENT pouvoir faire pivoter une pièce par quarts de tour autour de chaque axe. Les rotations à d'autres angles ne sont pas prises en charge.
- **FR-013**: Le logiciel DOIT afficher les dimensions d'ensemble du meuble et les cotes de la pièce sélectionnée.
- **FR-014**: Le logiciel DOIT signaler les pièces qui se chevauchent, sans empêcher l'utilisateur de continuer.
- **FR-015**: Les utilisateurs DOIVENT pouvoir annuler et rétablir chaque modification du meuble, au moins sur les 50 dernières actions du projet ouvert.
- **FR-016**: Si le caisson a été ajusté à la main, le logiciel DOIT prévenir que changer ses dimensions d'ensemble remplacera ces ajustements, et permettre d'y renoncer.

**Liste de découpe**

- **FR-017**: Le logiciel DOIT afficher en permanence, à côté de la vue 3D, une liste de découpe recalculée à chaque modification du meuble.
- **FR-018**: Chaque ligne DOIT indiquer la quantité, les noms des pièces concernées, la longueur, la largeur, l'épaisseur et le matériau, en millimètres.
- **FR-019**: Le logiciel DOIT regrouper sur une même ligne les pièces de mêmes dimensions, de même épaisseur et de même matériau, quels que soient leur nom, leur position et leur orientation.
- **FR-020**: La longueur affichée DOIT toujours être la plus grande des deux dimensions d'une ligne.
- **FR-021**: Le logiciel DOIT indiquer, par couple matériau et épaisseur, le nombre total de pièces et la surface totale de bois en mètres carrés.
- **FR-022**: Toutes les cotes DOIVENT être exactes à 0,1 mm, sans erreur d'arrondi visible, y compris après une succession de modifications.

**Projets et exports**

- **FR-023**: Les utilisateurs DOIVENT pouvoir enregistrer un projet dans un fichier à l'emplacement de leur choix et le rouvrir à l'identique. Chaque fichier DOIT indiquer la version de son format, afin que les versions ultérieures du logiciel puissent le rouvrir.
- **FR-024**: Le logiciel DOIT avertir avant toute perte de modifications non enregistrées et proposer d'enregistrer, d'abandonner ou d'annuler.
- **FR-025**: Le logiciel DOIT signaler clairement les fichiers illisibles ou incompatibles sans altérer le projet en cours.
- **FR-026**: Le logiciel DOIT exporter la liste de découpe en PDF, avec le nom du projet, la date, une image du meuble, la liste et les totaux, sur des pages A4.
- **FR-027**: Le logiciel DOIT exporter la liste de découpe en CSV lisible par les tableurs courants en configuration française.

**Installation et fonctionnement**

- **FR-028**: Le logiciel DOIT être fourni avec un installeur Windows qui crée une icône sur le bureau et une entrée dans le menu Démarrer, sans exiger d'autre logiciel.
- **FR-029**: Le logiciel DOIT s'ouvrir par un double-clic sur son icône, sans console ni autre fenêtre technique.
- **FR-030**: Le logiciel DOIT se désinstaller par la procédure standard de Windows, sans supprimer les fichiers de projet de l'utilisateur.
- **FR-031**: Toutes les fonctionnalités DOIVENT marcher sans connexion réseau, sans compte et sans envoyer aucune donnée.
- **FR-032**: L'interface DOIT être en français et utiliser le millimètre comme seule unité de saisie.

### Key Entities *(include if feature involves data)*

- **Projet**: Un meuble en cours de conception, enregistré dans un fichier. Il a un nom et contient l'ensemble des pièces, ainsi que les paramètres du caisson s'il a été créé ainsi.
- **Paramètres de caisson**: Les valeurs saisies pour générer un caisson (largeur, hauteur, profondeur, épaisseur du bois, épaisseur du fond, nombre d'étagères).
- **Pièce**: Un panneau du meuble, avec son nom, sa longueur, sa largeur, son épaisseur, son matériau facultatif, sa position et son orientation. C'est la seule source des dimensions.
- **Ligne de découpe**: Le regroupement calculé de pièces identiques à découper : quantité, noms, dimensions, épaisseur et matériau. Elle n'est jamais saisie ni modifiée directement.
- **Totaux**: Le nombre de pièces et la surface de bois par couple matériau et épaisseur, calculés à partir des lignes de découpe.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un nouvel utilisateur obtient la liste de découpe d'un caisson en moins de 2 minutes après avoir ouvert le logiciel, sans documentation.
- **SC-002**: Le logiciel est utilisable moins de 5 secondes après le double-clic sur l'icône, sur un portable à carte graphique intégrée.
- **SC-003**: Sur un jeu de meubles de référence calculés à la main, 100 % des quantités et des cotes de la liste de découpe sont exactes à 0,1 mm.
- **SC-004**: Après une modification, la vue 3D et la liste de découpe sont à jour en moins d'une seconde, sur un meuble de 200 pièces.
- **SC-005**: La rotation de la vue 3D reste fluide, sans saccade perceptible, sur un meuble de 200 pièces et un portable à carte graphique intégrée.
- **SC-006**: Un projet rouvert donne une liste de découpe identique à 100 % à celle du projet enregistré.
- **SC-007**: L'installation prend moins de 2 minutes et ne demande aucun logiciel supplémentaire sur un Windows sans outil de développement.
- **SC-008**: 100 % des fonctionnalités marchent avec le réseau désactivé.
- **SC-009**: Une personne peut découper toutes les pièces d'un meuble à partir du seul PDF imprimé, sans revenir au logiciel.

## Assumptions

- L'utilisateur principal est un particulier qui fabrique ses propres meubles et connaît le vocabulaire courant du travail du bois.
- Le logiciel fonctionne sous Windows 10 et 11, 64 bits. Les autres systèmes sont hors périmètre.
- Dans cette version, toutes les pièces sont des panneaux rectangulaires. Les formes courbes, les perçages, les entailles et les assemblages (tourillons, queues d'aronde, etc.) sont hors périmètre : leurs effets sur les cotes sont ajustés par l'utilisateur.
- Dans cette version, le seul modèle de départ est le caisson. Les portes, tiroirs et autres éléments se construisent en ajoutant des panneaux à la main.
- D'autres modèles de meubles et la modification de la forme des pièces (pièces non rectangulaires) sont prévus dans un second temps et feront l'objet de leur propre spécification. Cette version ne les construit pas, mais ses choix ne doivent pas les rendre impossibles, et les projets enregistrés devront rester lisibles après cette évolution.
- La liste de découpe donne des cotes finies. Le trait de scie, le sens du fil, les chants et les prix sont hors périmètre de cette version.
- Le calepinage (disposition des pièces sur les panneaux bruts pour limiter les chutes) est prévu pour une version ultérieure et fera l'objet de sa propre spécification.
- Les dimensions acceptées vont de 0,1 mm à 10 000 mm.
- Les étagères sont fixes et ont la même profondeur que les côtés. L'utilisateur peut les ajuster à la main ensuite.
- Un seul projet est ouvert à la fois, et il n'y a pas d'enregistrement automatique dans cette version.
- Les mises à jour se font en installant manuellement une nouvelle version : le logiciel ne vérifie rien en ligne.
