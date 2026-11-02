---

description: "Liste des tâches pour la conception de meubles et la liste de découpe"
---

# Tasks: Conception de meubles et liste de découpe

**Input**: Design documents from `specs/001-furniture-cut-list/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Inclus, car le principe IV de la constitution impose d'écrire les tests avant le code pour toute règle qui produit ou modifie une cote. Écrire ces tests et vérifier qu'ils échouent avant d'implémenter.

**Organization**: Les tâches sont groupées par parcours utilisateur, pour que chacun puisse être construit et vérifié séparément.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut être fait en parallèle (fichiers différents, aucune dépendance en attente)
- **[Story]**: Parcours utilisateur concerné (US1 à US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prouver la chaîne complète (`test`, `dev`, `pack`, `dist`) sur une fenêtre vide, avant d'écrire la moindre fonctionnalité.

- [X] T001 Après confirmation de l'utilisateur, installer Node.js LTS (`winget install OpenJS.NodeJS.LTS`), vérifier `node --version` et noter la version retenue dans `package.json` (`engines`)
- [X] T002 Créer `package.json` avec les versions exactes de `research.md` (R14) et les scripts `dev`, `test`, `test:e2e`, `typecheck`, `pack`, `dist`, puis générer `package-lock.json` avec `npm install`
- [X] T003 [P] Créer `tsconfig.json` en mode strict, couvrant `src/` et `tests/`
- [X] T004 [P] Créer `.gitignore` pour `node_modules/`, `out/`, `dist/`, `test-results/` et `playwright-report/`
- [X] T005 Créer `electron.vite.config.ts` pour les cibles `main`, `preload` et `renderer`, avec le plugin React
- [X] T006 Créer la fenêtre vide : `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`
- [X] T007 [P] Créer `vitest.config.ts` et `tests/architecture.test.ts`, qui échoue si un fichier de `src/core` importe `electron`, `three`, `react` ou un module Node (principe V)
- [X] T008 [P] Créer `electron-builder.yml` (installeur NSIS par utilisateur, sans droits administrateur, nom CotaBois) et une icône provisoire `build/icon.ico`
- [X] T009 [P] Créer `playwright.config.ts` et `tests/e2e/launch.spec.ts`, qui lance l'application et vérifie l'ouverture de sa fenêtre
- [X] T010 Exécuter `npm test`, `npm run typecheck`, `npm run dev`, `npm run test:e2e`, `npm run pack` et `npm run dist`, corriger ce qui bloque et consigner dans `specs/001-furniture-cut-list/research.md` (R14 et R15) tout changement de version ou prérequis découvert

**Checkpoint**: La fenêtre vide se lance depuis les sources, empaquetée et installée. Les risques de R15 sont levés ou documentés.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, cotes et coquille de l'application, indispensables à tous les parcours.

**⚠️ CRITICAL**: Aucun parcours ne commence avant la fin de cette phase.

- [X] T011 [P] Écrire `tests/core/units.test.ts` : `"18,5"` et `"18.5"` donnent `185`, refus du vide, du non numérique et de plus d'une décimale (`18,55`), `formatMm(185)` donne `"18,5"`, `formatMm(180)` donne `"18"`, aller-retour exact, surfaces en m² à deux décimales avec virgule (FR-022, FR-032)
- [X] T012 [P] Écrire `tests/core/model.test.ts` avec les limites du modèle : nom de pièce « 1 à 80 caractères après suppression des espaces », matériau « 0 à 80 caractères », longueurs « 1 à 100 000 », position « entiers de −1 000 000 à 1 000 000 », `u` et `v` « axes signés et perpendiculaires », nom de projet « 1 à 120 caractères après suppression des espaces »
- [X] T013 [P] Écrire `tests/core/geometry.test.ts` : `pieceBounds` sur les 24 orientations possibles et `projectBounds`, y compris `null` sans pièce
- [X] T014 [P] Implémenter `src/core/units.ts` (`parseMm`, `formatMm`, `formatSquareMeters`), en entiers en dixièmes de millimètre
- [X] T015 Implémenter `src/core/model.ts` : types `Project`, `Piece`, `Shape` (`{ kind: "rectangle", length, width }`), `CaissonTemplate`, `CaissonParams`, type de résultat `{ ok, value }` ou `{ ok, error }`, validation et `createEmptyProject` (FR-005, FR-006)
- [X] T016 Implémenter `pieceBounds` et `projectBounds` dans `src/core/geometry.ts`
- [X] T017 Créer `src/renderer/store.ts` : `EditorState` avec le projet et la sélection, seul point d'appel des modifications du cœur
- [X] T018 Créer `src/main/menu.ts` avec le menu français de `contracts/desktop-bridge.md`, exposer `onMenuCommand` dans `src/preload/index.ts` et router les commandes dans `src/renderer/store.ts` ; les entrées pas encore implémentées restent désactivées
- [X] T019 Mettre en place la disposition de `src/renderer/App.tsx` et `src/renderer/styles.css` : vue 3D au centre, panneau de saisie, liste de découpe en permanence à côté de la vue (FR-017, FR-032)

**Checkpoint**: Les tests du cœur passent, et la fenêtre affiche la disposition vide avec son menu.

---

## Phase 3: User Story 1 - Des dimensions à la liste de découpe (Priority: P1) 🎯 MVP

**Goal**: Saisir un caisson et obtenir aussitôt sa vue 3D et sa liste de découpe exacte.

**Independent Test**: Saisir un caisson de 800 × 1800 × 400 mm, bois de 18 mm, fond de 5 mm, 3 étagères, et retrouver 2 × 1800 × 395 × 18, 5 × 764 × 395 × 18 et 1 × 1800 × 800 × 5 (quickstart, V1 et V2).

### Tests for User Story 1 ⚠️

> **NOTE: Écrire ces tests d'abord et vérifier qu'ils échouent avant d'implémenter.**

- [X] T020 [P] [US1] Créer le jeu de référence calculé à la main dans `tests/fixtures/reference-furniture.ts` : caisson de V1, caisson sans fond, caisson sans étagère, caisson à cotes décimales, table de V3 (SC-003)
- [X] T021 [P] [US1] Écrire `tests/core/caisson.test.ts` : pièces et positions de la règle de génération, `yₖ` de 445,5, 891 et 1336,5 mm sur l'exemple, fond à 0, et contraintes « `width > 2 × boardThickness` », « `height > 2 × boardThickness` », « `depth > backThickness` », « `shelfCount × boardThickness < height − 2 × boardThickness` », `shelfCount` de « 0 à 100 », `backThickness` « 0 ou 1 à 100 000 », avec le nombre maximal d'étagères dans le message (FR-001 à FR-004)
- [X] T022 [P] [US1] Écrire `tests/core/cutList.test.ts` : regroupement par dimensions remises en ordre, épaisseur et matériau, indépendant du nom, de la position et de l'orientation ; matériau comparé sans tenir compte de la casse ni des espaces ; lignes distinctes si l'épaisseur ou le matériau diffère ; tri ; totaux par matériau et épaisseur ; jeu de référence (FR-018 à FR-022)
- [X] T023 [P] [US1] Écrire `tests/e2e/us1-caisson.spec.ts` : saisie de V1, liste affichée, passage du fond à 0, saisies refusées de V2 avec meuble inchangé

### Implementation for User Story 1

- [X] T024 [US1] Implémenter `validateCaissonParams` et `applyCaisson` dans `src/core/caisson.ts`, selon la règle de génération de `data-model.md`, avec les noms Côté gauche, Côté droit, Dessous, Dessus, Étagère k et Fond (FR-002, FR-003, FR-004)
- [X] T025 [US1] Implémenter `computeCutList` dans `src/core/cutList.ts` : lignes, longueur toujours supérieure ou égale à la largeur, tri et totaux en entiers (FR-019, FR-020, FR-021, FR-022)
- [X] T026 [US1] Créer `src/renderer/viewport/Viewport.ts` : scène Three.js, géométrie de boîte partagée, contours, conversion des dixièmes de mm uniquement pour l'affichage, rendu à la demande (FR-007, SC-005)
- [X] T027 [US1] Ajouter dans `src/renderer/viewport/Viewport.ts` la rotation, le zoom, le déplacement de la vue avec `OrbitControls`, et le recadrage sur tout le meuble, relié à `view:frame` (FR-007)
- [X] T028 [US1] Créer `src/renderer/panels/CaissonForm.tsx` : champs du caisson, application à la sortie du champ ou avec Entrée, message d'erreur par champ, dernière valeur valide conservée (FR-001, FR-004, FR-032)
- [X] T029 [US1] Créer `src/renderer/panels/CutListPanel.tsx` : quantité, noms, longueur, largeur, épaisseur, matériau, et totaux avec la surface en m² (FR-017, FR-018, FR-021)
- [X] T030 [US1] Relier le formulaire, la vue 3D et la liste au projet dans `src/renderer/store.ts` et `src/renderer/App.tsx`, avec un état vide qui invite à créer un caisson ou à ajouter une pièce, et l'affichage des dimensions d'ensemble (FR-005, FR-013, FR-017)

**Checkpoint**: V1 et V2 passent, et le logiciel répond déjà à la question « que dois-je découper ? ».

---

## Phase 4: User Story 2 - Installer et lancer d'un clic (Priority: P1)

**Goal**: Un installeur Windows, une icône, et un logiciel qui se lance sans étape préalable ni réseau.

**Independent Test**: Sur un Windows sans outil de développement et sans réseau, installer puis double-cliquer sur l'icône (quickstart, V7).

### Tests for User Story 2 ⚠️

- [X] T031 [P] [US2] Écrire `tests/e2e/us2-packaged.spec.ts` : lance `dist/win-unpacked/CotaBois.exe`, vérifie que la fenêtre s'ouvre, qu'une requête `http(s)` est bloquée, et que toute navigation et ouverture de fenêtre sont refusées (FR-029, FR-031)

### Implementation for User Story 2

- [X] T032 [US2] Dans `src/main/index.ts`, appliquer `contextIsolation`, `sandbox`, `nodeIntegration: false`, `spellcheck: false`, refuser navigation et nouvelles fenêtres, et bloquer les requêtes `http(s)` dans la version empaquetée (FR-031, principe II)
- [X] T033 [P] [US2] Ajouter dans `src/renderer/index.html` une politique de sécurité du contenu qui n'autorise que les ressources de l'application (FR-031)
- [X] T034 [US2] Dans `src/main/index.ts`, n'afficher la fenêtre qu'une fois prête, sans console ni autre fenêtre technique (FR-029, SC-002)
- [X] T035 [P] [US2] Créer l'icône définitive `build/icon.ico`, aux tailles standard de Windows (FR-028)
- [X] T036 [US2] Finaliser `electron-builder.yml` : raccourcis du bureau et du menu Démarrer, désinstallation standard, données des projets jamais placées dans le dossier d'installation (FR-028, FR-030)
- [X] T037 [US2] Construire l'installeur avec `npm run dist` et vérifier sur la machine de développement l'installation, l'icône, le lancement et la désinstallation ; le scénario V7 complet sur un Windows vierge reste à faire en phase finale (SC-007)

**Checkpoint**: Le double-clic sur l'icône ouvre le MVP de l'US1, sans réseau.

---

## Phase 5: User Story 3 - Ajuster le meuble en 3D (Priority: P2)

**Goal**: Modifier, déplacer, pivoter, dupliquer, supprimer et ajouter des panneaux, avec annulation, y compris depuis un projet vide.

**Independent Test**: Construire depuis un projet vide une table avec un plateau et quatre pieds, et vérifier la liste de découpe (quickstart, V3).

### Tests for User Story 3 ⚠️

- [X] T038 [P] [US3] Écrire `tests/core/pieces.test.ts` : `addPiece`, `duplicatePiece` sans chevauchement, `removePieces`, `updatePiece` avec refus d'une valeur invalide, `rotatePiece` sans changement de la liste de découpe, passage de `customized` à `true` (FR-009, FR-012, FR-016)
- [X] T039 [P] [US3] Écrire `tests/core/snap.test.ts` : alignement sur la face voisine sous le seuil de 5 mm, aucun alignement au-delà, position résultante exacte (FR-011)
- [X] T040 [P] [US3] Écrire `tests/core/overlaps.test.ts` : volumes qui s'interpénètrent signalés, contact bord à bord non signalé (FR-014)
- [X] T041 [P] [US3] Écrire `tests/core/history.test.ts` : annuler et rétablir exacts, `redo` vidé après un nouvel état, limite de 100 états, au moins 50 actions annulables (FR-015)
- [X] T042 [P] [US3] Écrire `tests/e2e/us3-edit.spec.ts` : construction de la table de V3, sélection croisée, quart de tour, Ctrl+Z et Ctrl+Y, chevauchement signalé, avertissement sur un caisson retouché

### Implementation for User Story 3

- [X] T043 [US3] Implémenter `addPiece`, `duplicatePiece`, `removePieces`, `updatePiece`, `rotatePiece` et `renameProject` dans `src/core/pieces.ts` (FR-009, FR-010, FR-012)
- [X] T044 [P] [US3] Implémenter `createHistory`, `pushState`, `undo` et `redo` dans `src/core/history.ts` (FR-015)
- [X] T045 [US3] Implémenter `findOverlaps` et `snapPosition` dans `src/core/geometry.ts` (FR-011, FR-014)
- [X] T046 [US3] Ajouter dans `src/renderer/store.ts` l'historique et les actions sur les pièces, et nettoyer la sélection des pièces supprimées (FR-009, FR-015)
- [X] T047 [US3] Ajouter dans `src/renderer/viewport/Viewport.ts` la sélection par lancer de rayon, la mise en évidence et la marque des pièces en chevauchement (FR-008, FR-014)
- [X] T048 [US3] Ajouter dans `src/renderer/viewport/Viewport.ts` les poignées de déplacement `TransformControls`, avec passage par `snapPosition` pendant le glissement (FR-010, FR-011)
- [X] T049 [US3] Créer `src/renderer/panels/PiecePanel.tsx` : nom, cotes, matériau et position exacte de la pièce sélectionnée, boutons de quart de tour par axe, duplication et suppression (FR-009, FR-010, FR-012, FR-013)
- [X] T050 [US3] Dans `src/renderer/panels/CutListPanel.tsx`, relier la sélection d'une ligne à ses pièces dans la vue 3D, et inversement (FR-008)
- [X] T051 [US3] Dans `src/renderer/App.tsx`, ajouter le bouton d'ajout d'un panneau, mentionner cet ajout dans le message de l'état vide, et signaler les chevauchements sans blocage (FR-005, FR-009, FR-014)
- [X] T052 [US3] Dans `src/renderer/panels/CaissonForm.tsx`, demander confirmation avant de régénérer un caisson avec `customized = true`, et permettre d'y renoncer (FR-016)
- [X] T053 [US3] Activer `edit:undo`, `edit:redo`, `edit:duplicate` et `edit:delete` dans `src/main/menu.ts` et `src/renderer/store.ts` (FR-015)

**Checkpoint**: V3 passe, et l'US1 fonctionne toujours.

---

## Phase 6: User Story 4 - Enregistrer et reprendre un projet (Priority: P3)

**Goal**: Enregistrer un meuble dans un fichier, le rouvrir à l'identique, sans jamais perdre de travail en silence.

**Independent Test**: Enregistrer, fermer, rouvrir et comparer le meuble et sa liste (quickstart, V4).

### Tests for User Story 4 ⚠️

- [X] T054 [P] [US4] Créer dans `tests/fixtures/projects/` un fichier `.cotabois` valide en version 1, un fichier abîmé, un fichier sans `formatVersion` et un fichier de version future
- [X] T055 [P] [US4] Écrire `tests/core/projectFile.test.ts` : aller-retour strictement égal, codes `file-corrupted`, `not-a-project` et `format-too-recent`, `id` en double, `shape.kind` inconnu, aucune ouverture partielle (FR-023, FR-025, SC-006)
- [X] T056 [P] [US4] Écrire `tests/e2e/us4-project.spec.ts`, avec dialogues simulés : enregistrer, rouvrir, question à la fermeture, fichier invalide sans effet sur le projet en cours (FR-024, FR-025)

### Implementation for User Story 4

- [X] T057 [US4] Implémenter `serializeProject`, `parseProject` et la chaîne de migrations, vide pour l'instant, dans `src/core/projectFile.ts`, selon `contracts/project-file.md` (FR-023, FR-025)
- [X] T058 [US4] Implémenter dans `src/main/files.ts` les dialogues, la lecture, l'écriture atomique par fichier temporaire et renommage, le chemin courant détenu par le processus principal et `Documents` comme dossier par défaut (FR-023, FR-030)
- [X] T059 [US4] Exposer `openProject`, `projectOpened`, `saveProject`, `saveProjectAs`, `newProject`, `setDirty`, `setTitle`, `onCloseRequested` et `confirmClose` dans `src/preload/index.ts` et `src/main/index.ts`, selon `contracts/desktop-bridge.md`
- [X] T060 [US4] Ajouter dans `src/renderer/store.ts` les actions de fichier, l'état « modifié » calculé par rapport à `savedProject`, y compris après annulation, et la remise à zéro de l'historique à l'ouverture (FR-023, FR-024)
- [X] T061 [US4] Créer `src/renderer/panels/UnsavedDialog.tsx` : enregistrer, abandonner ou annuler, avant de fermer, d'ouvrir ou de créer un projet (FR-024)
- [X] T062 [US4] Afficher les erreurs de lecture et d'écriture sans altérer le projet en cours, y compris disque plein et dossier protégé, dans `src/renderer/App.tsx` (FR-025)
- [X] T063 [US4] Activer `file:new`, `file:open`, `file:save` et `file:save-as` dans `src/main/menu.ts` et `src/renderer/store.ts`, et afficher le nom du projet et l'indicateur de modification dans le titre de la fenêtre

**Checkpoint**: V4 passe. Le logiciel peut servir sur plusieurs séances de travail.

---

## Phase 7: User Story 5 - Exporter la liste pour l'atelier (Priority: P3)

**Goal**: Emporter la liste à l'atelier en PDF, ou la reprendre dans un tableur en CSV.

**Independent Test**: Exporter un meuble et vérifier que chaque document contient les mêmes lignes que la liste affichée (quickstart, V5).

### Tests for User Story 5 ⚠️

- [ ] T064 [P] [US5] Écrire `tests/core/csv.test.ts` : BOM, séparateur `;`, virgule décimale, CRLF, guillemets, protection des textes commençant par `=`, `+`, `-` ou `@`, exemple de `contracts/exports.md` (FR-027)
- [ ] T065 [P] [US5] Écrire `tests/e2e/us5-export.spec.ts`, avec dialogues simulés : CSV et PDF non vides, nom de fichier proposé, exports indisponibles sans pièce (FR-026, FR-027)

### Implementation for User Story 5

- [ ] T066 [US5] Implémenter `toCsv` dans `src/core/csv.ts`, selon `contracts/exports.md` (FR-027)
- [ ] T067 [P] [US5] Ajouter la capture d'une image isométrique sur fond blanc dans `src/renderer/viewport/Viewport.ts` (FR-026)
- [ ] T068 [US5] Créer `src/renderer/report/ReportView.tsx` et `src/renderer/report/report.css` : vue d'impression avec nom du projet, date, dimensions d'ensemble, image, liste et totaux, en-tête répété, lignes jamais coupées, lisible en noir et blanc (FR-026, SC-009)
- [ ] T069 [US5] Implémenter `src/main/pdf.ts` avec `printToPDF` en A4 portrait, marges de 15 mm et numéro de page, et ajouter l'écriture du CSV dans `src/main/files.ts`, avec les noms de fichiers proposés sans caractères interdits (FR-026, FR-027)
- [ ] T070 [US5] Exposer `exportCsv` et `exportPdf` dans `src/preload/index.ts`, les activer dans `src/main/menu.ts` et `src/renderer/store.ts`, et les rendre indisponibles sans pièce, avec la raison affichée

**Checkpoint**: V5 passe. Tous les parcours sont fonctionnels.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Vérifier l'ensemble, y compris ce que les tests automatiques ne peuvent pas prouver.

- [ ] T071 [P] Générer le projet de test de 200 pièces `tests/fixtures/projects/200-pieces.cotabois`, et mesurer V6 sur le portable de référence ; optimiser uniquement si un seuil de SC-002, SC-004 ou SC-005 n'est pas atteint
- [ ] T072 [P] Mettre à jour `README.md` : présentation, installation et commandes de développement
- [ ] T073 Exécuter tous les tests et la vérification des types, et rejouer V1 à V6 de `quickstart.md`, en consignant les résultats dans `specs/001-furniture-cut-list/checklists/validation.md`
- [ ] T074 Construire l'installeur final et rejouer V7 sur un Windows vierge, en consignant le résultat dans `specs/001-furniture-cut-list/checklists/validation.md` ; l'activation de Windows Sandbox est faite par l'utilisateur (SC-007, SC-008)
- [ ] T075 Faire chronométrer par l'utilisateur la création d'un caisson au premier usage, sans documentation, et consigner le résultat dans `specs/001-furniture-cut-list/checklists/validation.md` (SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance, mais T001 attend l'accord de l'utilisateur.
- **Foundational (Phase 2)** : dépend du Setup et bloque tous les parcours.
- **Parcours (Phases 3 à 7)** : dépendent de la phase 2, et se font dans l'ordre de priorité.
- **Polish (Phase 8)** : dépend de tous les parcours.

### User Story Dependencies

- **US1 (P1)** : après la phase 2, sans dépendance à un autre parcours.
- **US2 (P1)** : après la phase 2. Techniquement indépendant, mais il prend sa valeur avec l'US1.
- **US3 (P2)** : dépend de l'US1 (vue 3D et liste de découpe).
- **US4 (P3)** : après la phase 2 pour le cœur. L'interface suppose l'US1, et l'état « modifié » après annulation suppose l'US3.
- **US5 (P3)** : dépend de l'US1 (liste de découpe et vue 3D).

### Within Each User Story

- Les tests sont écrits d'abord, et doivent échouer avant l'implémentation.
- Le cœur vient avant le stockage de l'état, puis l'interface.
- Un parcours est terminé quand ses tests passent et que son scénario de `quickstart.md` a été rejoué dans le logiciel.

### Parallel Opportunities

- Phase 1 : T003, T004, T007, T008 et T009.
- Phase 2 : T011, T012 et T013, puis T014.
- Tests de chaque parcours : toutes les tâches marquées [P].
- Après l'US1, l'US4 et l'US5 peuvent avancer côte à côte, à condition de coordonner les fichiers partagés (`store.ts`, `menu.ts`, `preload/index.ts`).

---

## Parallel Example: User Story 1

```bash
# Tests à écrire ensemble :
Task: "Jeu de référence dans tests/fixtures/reference-furniture.ts"
Task: "Tests de génération dans tests/core/caisson.test.ts"
Task: "Tests de la liste dans tests/core/cutList.test.ts"
Task: "Scénario de bout en bout dans tests/e2e/us1-caisson.spec.ts"
```

---

## Implementation Strategy

### MVP First

1. Terminer les phases 1 et 2.
2. Terminer l'US1 (phase 3).
3. **STOP and VALIDATE** : rejouer V1 et V2 avec `npm run dev`.
4. Terminer l'US2 (phase 4) : le MVP s'installe et se lance d'un clic. **C'est le premier jalon utilisable.**

### Incremental Delivery

1. Setup et fondations : la chaîne fonctionne.
2. US1 et US2 : on obtient une liste de découpe depuis un vrai logiciel.
3. US3 : on peut dessiner autre chose qu'un caisson.
4. US4 : le travail se conserve.
5. US5 : la liste part à l'atelier.

Chaque étape s'ajoute sans casser les précédentes, et les tests du cœur protègent les cotes tout au long du projet.

---

## Notes

- Une tâche marquée [P] touche des fichiers différents et ne dépend d'aucune tâche en attente.
- Les valeurs entre guillemets dans les tâches sont reprises de `data-model.md`.
- Valider le travail après chaque tâche ou groupe logique de tâches, si l'utilisateur le demande.
- Les formes libres, les autres modèles de meubles et le calepinage restent hors de cette liste : ils auront leur propre spécification.
