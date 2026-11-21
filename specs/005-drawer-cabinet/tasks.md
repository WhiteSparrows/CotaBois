---

description: "Liste des tâches pour le meuble à tiroirs"
---

# Tasks: Meuble à tiroirs

**Input**: Design documents from `specs/005-drawer-cabinet/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Inclus, car le principe IV de la constitution impose d'écrire les tests avant le code pour toute règle qui produit une cote. Écrire ces tests et vérifier qu'ils échouent avant d'implémenter. Chaque cote attendue est calculée à la main.

**Organization**: Les tâches sont groupées par parcours utilisateur. La validation et le format de fichier sont dans les fondations, la génération dans le cœur vient avant le formulaire.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut être fait en parallèle (fichiers différents, aucune dépendance en attente)
- **[Story]**: Parcours utilisateur concerné (US1 à US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Les meubles de référence, calculés à la main, dont dépendent tous les tests.

- [ ] T001 [P] Créer `tests/fixtures/drawer-references.ts` : le meuble de référence (600 × 720 × 560, bois de 18, fond de 5, 3 tiroirs, réglages par défaut) avec ses 7 lignes de liste attendues et ses 23 pièces ; la variante de 721 mm (façades de 2373, 2373 et 2374 dixièmes, côtés de tiroir de 1973) ; les positions clés (façade du bas à `y` = 15, fond du tiroir du bas à `y` = 190, haut du tiroir du haut à `y` = 7010, tiroirs à `x` = 305) ; et les refus avec leur limite (10 tiroirs : 7 au maximum ; profondeur de 250 mm : 265 mm au minimum ; largeur de 80 mm ; bois de 25 mm qui fait toucher le dessous)
- [ ] T002 [P] Créer `tests/fixtures/projects/valid-v5.cotabois` selon `contracts/project-file-v5.md` : un meuble à tiroirs et quelques-unes de ses pièces

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modèle en union, réglages validés et format de fichier, sans changement visible.

**⚠️ CRITICAL**: Aucun parcours ne commence avant la fin de cette phase.

### Tests ⚠️

> **NOTE: Écrire ces tests d'abord et vérifier qu'ils échouent avant d'implémenter.**

- [ ] T003 [P] Écrire dans `tests/core/projectFile.test.ts` : aller-retour strictement égal d'un meuble à tiroirs ; caisson et fichiers en versions 1 à 4 lus à l'identique ; format exact de `valid-v5.cotabois` ; refus avec `file-corrupted` d'un modèle inconnu et de réglages invalides ; refus d'une version supérieure à 5. Adapter les tests qui attendent la version 4, y compris `tests/e2e/us4-project.spec.ts` (FR-014, FR-015)
- [ ] T004 [P] Écrire `tests/core/drawers.test.ts`, partie validation : `drawerCount` « Entier de 1 à 10 », `frontGap` « Entier de 0 à 100 (10 mm) », `slideGap` « Entier de 0 à 500 (50 mm), de chaque côté », `backThickness` « 0 ou dimension valide, inférieure à la profondeur », dimensions et épaisseurs valides ; puis les refus de `research.md`, R7, dans l'ordre, avec `field` et la limite donnée par le message (7 tiroirs au maximum, 265 mm au minimum) ; `maxDrawerCount` (FR-004, FR-009)

### Implementation

- [ ] T005 Étendre `src/core/model.ts` : `DrawerParams`, `DrawerCabinetTemplate`, `Template` en union par `kind` ; adapter les lectures de `template.params` qui supposent un caisson, dans `src/core/projectFile.ts` et `src/renderer/panels/CaissonForm.tsx`
- [ ] T006 Créer `src/core/drawers.ts`, partie réglages : `DEFAULT_DRAWER_PARAMS`, `validateDrawerParams` et `maxDrawerCount`, selon `data-model.md` et `research.md`, R7 (FR-004, FR-009)
- [ ] T007 Passer `src/core/projectFile.ts` en version 5 : lecture, validation et écriture du modèle `drawers`, migration identique depuis la version 4 (FR-014, FR-015)

**Checkpoint**: Un projet sait enregistrer un meuble à tiroirs et le relire, et le caisson est inchangé.

---

## Phase 3: User Story 1 - Créer un meuble à tiroirs à partir de ses dimensions (Priority: P1) 🎯 MVP

**Goal**: Choisir le modèle, saisir ses dimensions et obtenir le caisson, les façades et les tiroirs.

**Independent Test**: Créer le meuble de référence et comparer la liste de découpe au calcul à la main (quickstart, T1 et T3).

### Tests for User Story 1 ⚠️

- [ ] T008 [P] [US1] Compléter `tests/core/drawers.test.ts` : liste du meuble de référence identique à `drawer-references.ts` ; variante de 721 mm ; positions clés ; aucun chevauchement selon `findOverlaps` ; noms numérotés de haut en bas ; sans fond de caisson, 4 pièces de carcasse ; `template` de type `drawers` avec `customized: false` (FR-005, FR-006, FR-007, FR-008, FR-013, SC-002)
- [ ] T009 [P] [US1] Écrire `tests/core/templates.test.ts` : `applyTemplate` d'un caisson identique à `applyCaisson` sur `REFERENCE_CAISSONS` ; `carcassPieces` identique à un caisson sans étagère ; aiguillage vers le meuble à tiroirs (FR-002, FR-005)
- [ ] T010 [P] [US1] Écrire `tests/e2e/us9-drawers.spec.ts`, scénarios T1 et T3 : choix du modèle, création, 7 lignes et 23 pièces, aucun chevauchement signalé ; refus avec la limite, sans rien créer (FR-001, FR-009, SC-003)

### Implementation for User Story 1

- [ ] T011 [US1] Exporter `carcassPieces` depuis `src/core/caisson.ts`, sans changer le caisson (FR-005)
- [ ] T012 [US1] Compléter `src/core/drawers.ts` : `drawerLayout` et `applyDrawerCabinet`, selon `research.md`, R3 à R6 (FR-006, FR-007, FR-008, FR-013)
- [ ] T013 [US1] Créer `src/core/templates.ts` : `applyTemplate` et `TEMPLATE_LABELS` (FR-001, FR-002)
- [ ] T014 [US1] Ajouter `applyTemplateParams` dans `src/renderer/store.ts` ; créer `src/renderer/panels/FurnitureForm.tsx` avec le sélecteur `Modèle`, `src/renderer/panels/CaissonFields.tsx` extrait de `CaissonForm.tsx` sans changement de comportement, et `src/renderer/panels/DrawerFields.tsx` avec ses champs et la section repliée **Réglages des tiroirs** ; brancher le formulaire dans `src/renderer/App.tsx` (FR-001, FR-002, FR-004)

**Checkpoint**: T1 et T3 passent. On crée un meuble à tiroirs exact.

---

## Phase 4: User Story 2 - Ajuster le meuble après coup (Priority: P1)

**Goal**: Changer une dimension ou le nombre de tiroirs, et retrouver un meuble recalculé.

**Independent Test**: Passer de 3 à 4 tiroirs, puis changer la largeur après une retouche (quickstart, T4).

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] Compléter `tests/core/drawers.test.ts` : appliquer de nouveaux réglages remplace toutes les pièces et remet `customized` à faux ; une retouche par `updatePiece` le met à vrai (FR-010)
- [ ] T016 [P] [US2] Compléter `tests/e2e/us9-drawers.spec.ts`, scénario T4 : 4 tiroirs en une action annulable ; confirmation avant de remplacer un meuble retouché (FR-010)

### Implementation for User Story 2

- [ ] T017 [US2] Appliquer chaque champ de `src/renderer/panels/DrawerFields.tsx` à la sortie ou avec Entrée pour un meuble existant, avec la confirmation du caisson si le meuble a été retouché, dans `src/renderer/panels/FurnitureForm.tsx` (FR-010)

**Checkpoint**: T4 passe. Le meuble s'ajuste comme un caisson.

---

## Phase 5: User Story 3 - Choisir le modèle de départ (Priority: P2)

**Goal**: Passer d'un modèle à l'autre sans surprise, et retrouver le modèle à la réouverture.

**Independent Test**: Créer un caisson, passer au meuble à tiroirs, enregistrer et rouvrir (quickstart, T5 et T7).

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] Compléter `tests/e2e/us9-drawers.spec.ts`, scénarios T5 et T7 : confirmation avant de remplacer le caisson ; caisson identique à aujourd'hui ; modèle et réglages retrouvés après réouverture ; fichiers en versions 1 à 4 affichés avec `Caisson` (FR-002, FR-003, FR-014, FR-015, SC-004)

### Implementation for User Story 3

- [ ] T019 [US3] Dans `src/renderer/panels/FurnitureForm.tsx`, afficher le modèle du projet ouvert, et demander confirmation avant de remplacer un meuble par un autre modèle (FR-003)

**Checkpoint**: T5 et T7 passent. Tous les parcours P1 et P2 sont fonctionnels.

---

## Phase 6: User Story 4 - Chants et calepinage du meuble à tiroirs (Priority: P3)

**Goal**: L'option des chants s'applique au nouveau modèle, et le reste suit.

**Independent Test**: Créer le meuble de référence avec l'option des chants, puis ouvrir le calepinage (quickstart, T6).

### Tests for User Story 4 ⚠️

- [ ] T020 [P] [US4] Compléter `tests/core/drawers.test.ts` : avec `frontEdges`, bord `top` des côtés, du dessus et du dessous, et 4 bords de chaque façade ; aucun chant sur les tiroirs ni sur le fond (FR-011)
- [ ] T021 [P] [US4] Compléter `tests/e2e/us9-drawers.spec.ts`, scénario T6 : chants et trois groupes de calepinage, 18, 15 et 5 mm (FR-011, FR-012)

### Implementation for User Story 4

- [ ] T022 [US4] Appliquer `frontEdges` dans `src/core/drawers.ts`, et proposer la case dans `src/renderer/panels/DrawerFields.tsx` (FR-011)

**Checkpoint**: T6 passe. Tous les parcours sont fonctionnels.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Vérifier l'ensemble, y compris ce que les tests automatiques ne prouvent pas.

- [ ] T023 Contrôler à l'œil la vue 3D du meuble de référence, tiroirs fermés, et la liste imprimée, et consigner dans `specs/005-drawer-cabinet/checklists/validation.md`
- [ ] T024 [P] Mettre à jour `README.md` : le meuble à tiroirs dans la présentation, et ses limites
- [ ] T025 Compléter `tests/e2e/us2-packaged.spec.ts` avec T1 dans le logiciel empaqueté, exécuter `npm run pack` puis toute la suite, construire l'installeur avec `npm run dist`, et consigner les résultats dans `specs/005-drawer-cabinet/checklists/validation.md` (T8)
- [ ] T026 Faire chronométrer par l'utilisateur la création d'un meuble à 3 tiroirs jusqu'à la liste, et fabriquer les tiroirs à partir de la seule liste ; consigner dans `specs/005-drawer-cabinet/checklists/validation.md` (SC-001, SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance.
- **Foundational (Phase 2)** : dépend du Setup et bloque tous les parcours.
- **Parcours (Phases 3 à 6)** : dépendent de la phase 2, dans l'ordre de priorité.
- **Polish (Phase 7)** : dépend de tous les parcours.

### User Story Dependencies

- **US1 (P1)** : après la phase 2. Crée la génération et le formulaire.
- **US2 (P1)** : dépend de US1, dont il complète le formulaire.
- **US3 (P2)** : dépend de US1 pour le sélecteur.
- **US4 (P3)** : dépend de US1 ; peut passer avant US2 et US3.

### Within Each User Story

- Les tests sont écrits d'abord et doivent échouer avant l'implémentation.
- Le cœur vient avant l'état, puis l'interface.
- Un parcours est terminé quand ses tests passent et que son scénario de `quickstart.md` a été rejoué dans le logiciel.
- Pousser la branche à chaque point de contrôle vérifié.

### Parallel Opportunities

- Phase 1 : T001 et T002.
- Phase 2 : T003 et T004.
- Tests de chaque parcours : les tâches marquées [P]. Celles qui complètent `drawers.test.ts` ou `us9-drawers.spec.ts` se font l'une après l'autre.
- Les parcours partagent `drawers.ts` et `FurnitureForm.tsx` : ils se font à la suite.

---

## Parallel Example: Phase 2

```bash
# Tests à écrire ensemble :
Task: "Format version 5 dans tests/core/projectFile.test.ts"
Task: "Validation du meuble à tiroirs dans tests/core/drawers.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Terminer les phases 1 et 2.
2. Terminer l'US1 (phase 3).
3. **STOP and VALIDATE** : rejouer T1 et T3 avec `npm run dev`.
4. Terminer l'US2 (phase 4) : **c'est le premier jalon réellement utile**, car on crée et on ajuste un meuble à tiroirs exact.

### Incremental Delivery

1. Fondations : modèle en union et fichier en version 5.
2. US1 : la génération et la création.
3. US2 : l'ajustement.
4. US3 : le passage d'un modèle à l'autre.
5. US4 : les chants.

---

## Notes

- Une tâche marquée [P] touche des fichiers différents et ne dépend d'aucune tâche en attente.
- Les valeurs entre guillemets sont reprises de `data-model.md`.
- Plusieurs meubles par projet, les façades encastrées, les tiroirs de hauteurs différentes, les poignées et les rainures restent hors de cette liste.
