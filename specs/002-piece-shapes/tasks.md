---

description: "Liste des tâches pour les pièces de forme : arrondis et découpes"
---

# Tasks: Pièces de forme : arrondis et découpes

**Input**: Design documents from `specs/002-piece-shapes/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Inclus, car le principe IV de la constitution impose d'écrire les tests avant le code pour toute règle qui produit ou modifie une cote. Écrire ces tests et vérifier qu'ils échouent avant d'implémenter.

**Organization**: Les tâches sont groupées par parcours utilisateur. Les fondations comprennent l'affichage et sa mesure de performance, principal risque technique, afin de le lever avant de construire l'éditeur.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut être fait en parallèle (fichiers différents, aucune dépendance en attente)
- **[Story]**: Parcours utilisateur concerné (US1 à US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Les données de référence, calculées à la main, dont dépendent tous les tests.

- [X] T001 [P] Créer `tests/fixtures/shape-references.ts` : formes de référence calculées à la main, dont l'exemple de `data-model.md` (tablette 8000 × 3000, maximum réel de `topLeft` égal à 1199), et un jeu de formes impossibles couvrant chaque règle de validation (SC-002, SC-007)
- [X] T002 [P] Créer `tests/fixtures/projects/valid-v2.cotabois` selon `contracts/project-file-v2.md`, avec coins modifiés, encoche et trou rond
- [X] T003 [P] Étendre `scripts/make-200-pieces.mjs` pour générer aussi `tests/fixtures/projects/200-pieces-shapes.cotabois`, en version 2 : 200 pièces dont 50 de forme, avec au moins 10 formes distinctes ; conserver `200-pieces.cotabois` en version 1, utile à la compatibilité (SC-004, SC-005)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modèle, validation, format de fichier, affichage 3D, et preuve que ce dernier reste fluide.

**⚠️ CRITICAL**: Aucun parcours ne commence avant la fin de cette phase.

### Tests ⚠️

> **NOTE: Écrire ces tests d'abord et vérifier qu'ils échouent avant d'implémenter.**

- [X] T004 [P] Écrire `tests/core/shape.test.ts`, validation : limites des champs (« De 0 à 50 » découpes, `radius` et `size` « 1 ou plus », `cornerRadius` « au plus la moitié du plus petit côté », `distance` « entre 0 et la dimension de la pièce »), somme des tailles des coins sur chaque côté, découpe dans le rectangle, découpe ne s'étendant pas sur toute une dimension ni sur deux bords opposés, cercle strictement intérieur, découpes qui ne se touchent pas, découpe ne touchant pas le carré d'un coin modifié, trou de diamètre impair vérifié exactement, message avec la valeur maximale (FR-002, FR-005, FR-006, FR-007, FR-008, FR-021)
- [X] T005 [P] Écrire dans `tests/core/shape.test.ts` les cas de `normalizeShape`, `resolveCutout` depuis chaque bord de référence, `shapeContains` (coins, arcs, chanfreins, trous), `shapeOutline`, et une comparaison avec une grille d'échantillons qui confirme qu'une forme valide reste d'un seul tenant (FR-005)
- [X] T006 [P] Écrire dans `tests/core/projectFile.test.ts` : aller-retour d'une forme strictement égal, migration de la version 1, format exact de la version 2, refus d'une forme invalide avec le nom de la pièce, refus d'une version supérieure à 2, `shaped` sans modification lu comme un rectangle (FR-021, FR-022), et adapter le test existant du format écrit
- [X] T007 [P] Écrire dans `tests/core/pieces.test.ts` : une découpe garde son bord de référence quand `length` ou `width` change, changement refusé si la forme ne tient plus, forme conservée par rotation, duplication et copier-coller (FR-012, FR-013)
- [X] T008 [P] Écrire `tests/e2e/shapes-display.spec.ts` : ouverture de `valid-v2.cotabois`, la pièce de forme est affichée dans chaque orientation, sans erreur de console (FR-014)

### Implementation

- [X] T009 Ajouter dans `src/core/model.ts` les types `ShapedShape`, `CornerTreatment`, `Cutout`, étendre `Shape`, et appeler la validation de forme depuis `validatePiece`
- [X] T010 Implémenter dans `src/core/shape.ts` : `validateShape`, `normalizeShape`, `resolveCutout`, `maxCornerSize`, en entiers, en doublant les coordonnées pour les diamètres impairs (FR-002, FR-005, FR-006, FR-007, FR-008, FR-021)
- [X] T011 Implémenter dans `src/core/shape.ts` : `shapeContains` et `shapeOutline`, avec segments et arcs exacts (FR-014)
- [X] T012 Adapter `updatePiece` et la copie de forme dans `src/core/pieces.ts` pour revalider après un changement de dimension et conserver la forme (FR-012, FR-013)
- [X] T013 Passer `src/core/projectFile.ts` en version 2, avec lecture et écriture des formes et migration de la version 1 (FR-021, FR-022)
- [X] T014 Créer `src/renderer/viewport/shapeMesh.ts` : géométrie extrudée depuis `shapeOutline`, 16 segments par quart de tour, contours limités aux vraies arêtes, cache par forme et épaisseur (FR-014, SC-005)
- [X] T015 Dans `src/renderer/viewport/Viewport.ts`, afficher les pièces de forme avec une matrice construite à partir des axes signés `u`, `v` et de leur produit vectoriel, sélection et poignées comprises, en gardant la boîte partagée pour les rectangles (FR-012, FR-014)
- [X] T016 Écrire et exécuter `tests/e2e/v6-performance.spec.ts`, cas `200-pieces-shapes.cotabois` : modification en moins de 1 s, rotation fluide avec image qui change réellement ; si un seuil n'est pas tenu, corriger avant de continuer (SC-004, SC-005, F8)

**Checkpoint**: Une pièce de forme chargée d'un fichier s'affiche correctement et le meuble de 200 pièces reste fluide. Le principal risque technique est levé.

---

## Phase 3: User Story 1 - Arrondir les coins d'une pièce (Priority: P1) 🎯 MVP

**Goal**: Arrondir ou chanfreiner chaque coin, avec aperçu à plat, et voir la pièce signalée dans la liste.

**Independent Test**: Arrondir deux coins d'une tablette de 800 × 300 × 18 mm et vérifier la forme, les cotes relues et la liste (quickstart, F1).

### Tests for User Story 1 ⚠️

- [X] T017 [P] [US1] Écrire dans `tests/core/pieces.test.ts` : `setCorner` applique, refuse sans modifier avec le maximum, marque le caisson comme retouché, ramène à un rectangle quand tout redevient droit (FR-001, FR-002, FR-010)
- [X] T018 [P] [US1] Écrire dans `tests/core/shape.test.ts` et `tests/core/cutList.test.ts` : `canonicalShapeKey` identique sous rotation et retournement, pour une pièce carrée ou non, et cotée depuis des bords différents ; regroupement par forme, formes différentes séparées, numéros de plan, totaux inchangés, liste identique sans forme (FR-016, FR-017, FR-018, FR-023)
- [X] T019 [P] [US1] Écrire `tests/e2e/us6-shapes.spec.ts`, scénario F1 : édition des coins, refus avec maximum, annulation, mention `Plan 1` dans la liste, poignée de coin tirée sur l'aperçu

### Implementation for User Story 1

- [X] T020 [US1] Implémenter `setCorner` dans `src/core/pieces.ts`, atomique sur une liste de pièces (FR-001, FR-002, FR-010)
- [X] T021 [US1] Implémenter `canonicalShapeKey` dans `src/core/shape.ts`, et le regroupement et les numéros de plan dans `src/core/cutList.ts` (FR-016, FR-017, FR-018, FR-023)
- [X] T022 [US1] Ajouter dans `src/renderer/store.ts` l'état d'ouverture de l'éditeur et les actions de forme, une action annulable par modification (FR-010)
- [X] T023 [US1] Créer `src/renderer/panels/ShapePreview.tsx` : aperçu SVG à l'échelle, noms des bords, poignées de coin au millimètre près, bornées au maximum, une action annulable au relâchement (FR-009)
- [X] T024 [US1] Créer `src/renderer/panels/ShapeEditor.tsx` : type et valeur de chaque coin, refus affiché par champ, bouton Terminer (FR-001, FR-002, FR-009)
- [X] T025 [US1] Ajouter le bouton Modifier la forme dans `src/renderer/panels/PiecePanel.tsx`, afficher l'éditeur à la place de la liste dans `src/renderer/App.tsx`, et la mention `Plan n` dans `src/renderer/panels/CutListPanel.tsx` (FR-009, FR-016)

**Checkpoint**: F1 passe. Une tablette aux coins arrondis se dessine et se retrouve dans la liste.

---

## Phase 4: User Story 2 - Faire des découpes dans une pièce (Priority: P1)

**Goal**: Ajouter, déplacer et supprimer encoches et trous, avec un signalement des chevauchements réels.

**Independent Test**: Faire une encoche de 50 × 30 mm et un trou de 60 mm, vérifier forme et cotes (quickstart, F2 et F3).

### Tests for User Story 2 ⚠️

- [X] T026 [P] [US2] Écrire dans `tests/core/pieces.test.ts` : `addCutout`, `updateCutout`, `removeCutout`, refus sans modification, au moins 20 découpes, retour au rectangle après suppression (FR-003, FR-004, FR-005, FR-006, FR-010)
- [X] T027 [P] [US2] Écrire dans `tests/core/overlaps.test.ts` : planche logée exactement dans une encoche ou un trou non signalée, vrai recouvrement signalé, pièces parallèles et perpendiculaires, orientations signées, résultat inchangé pour des rectangles (FR-015)
- [X] T028 [P] [US2] Compléter `tests/e2e/us6-shapes.spec.ts`, scénarios F2 et F3 : encoche, trou, rayon d'angle, glissement au millimètre borné à la pièce, refus, clic à travers un trou sélectionnant la pièce derrière

### Implementation for User Story 2

- [X] T029 [US2] Implémenter `addCutout`, `updateCutout` et `removeCutout` dans `src/core/pieces.ts` (FR-003, FR-004, FR-005, FR-006, FR-010)
- [X] T030 [US2] Étendre `findOverlaps` dans `src/core/geometry.ts` avec la grille de plans critiques de `research.md`, R5, en gardant le filtre par encombrement (FR-015)
- [X] T031 [US2] Ajouter dans `src/renderer/panels/ShapePreview.tsx` l'affichage, la sélection et le glissement des découpes, au millimètre près, bornés à la plage valide (FR-009)
- [X] T032 [US2] Ajouter dans `src/renderer/panels/ShapeEditor.tsx` les boutons Encoche, Trou rectangulaire et Trou rond, le choix d'un emplacement libre, les champs de cotes, de bords de référence et de rayon d'angle, et la suppression (FR-003, FR-004)
- [X] T033 [US2] Vérifier dans `src/renderer/viewport/Viewport.ts` la sélection sur la géométrie réelle, y compris à travers les trous (FR-014)

**Checkpoint**: F2 et F3 passent. Une pièce arrondie et découpée se dessine entièrement.

---

## Phase 5: User Story 3 - Savoir comment fabriquer une pièce de forme (Priority: P1)

**Goal**: Un plan coté par forme dans le PDF, et le lien dans le CSV.

**Independent Test**: Exporter un meuble avec une pièce arrondie et percée, et reproduire la pièce à partir du seul PDF (quickstart, F4).

### Tests for User Story 3 ⚠️

- [ ] T034 [P] [US3] Écrire dans `tests/core/shape.test.ts` : `describeShape` donne chaque cote en toutes lettres, avec les bords de référence saisis (FR-019, FR-021, SC-002)
- [ ] T035 [P] [US3] Écrire dans `tests/core/csv.test.ts` : colonne `Plan` présente si au moins une ligne a une forme, vide pour les rectangles, CSV strictement inchangé sans forme (FR-020, FR-023)
- [ ] T036 [P] [US3] Compléter `tests/e2e/us5-export.spec.ts` : nombre de pages et de plans attendus, plan non coupé, PDF inchangé sans forme, et `tests/e2e/us6-shapes.spec.ts`, scénario F4 (FR-017, FR-019, FR-023)

### Implementation for User Story 3

- [ ] T037 [US3] Implémenter `describeShape` dans `src/core/shape.ts` (FR-019, FR-021)
- [ ] T038 [US3] Ajouter la colonne `Plan` dans `src/core/csv.ts` (FR-020)
- [ ] T039 [US3] Créer `src/renderer/report/ShapePlan.tsx` : dessin à l'échelle noir sur blanc, cotes d'ensemble, noms des bords, numéros, tableau, et ses styles d'impression dans `src/renderer/report/report.css`, sans coupure de page (FR-019)
- [ ] T040 [US3] Ajouter dans `src/renderer/report/ReportView.tsx` la section des plans, seulement s'il y en a, et la mention `Plan n` dans la liste (FR-019, FR-023)
- [ ] T041 [US3] Produire de vrais PDF, un plan simple et plusieurs plans avec de nombreuses découpes, et les contrôler à l'œil en les consignant dans `specs/002-piece-shapes/checklists/validation.md` (SC-003)

**Checkpoint**: F4 passe. Une pièce dessinée peut être fabriquée.

---

## Phase 6: User Story 4 - Réutiliser une forme (Priority: P3)

**Goal**: Appliquer une modification à plusieurs pièces en une action.

**Independent Test**: Arrondir les coins avant des 3 étagères d'un caisson en une seule action (quickstart, F5).

### Tests for User Story 4 ⚠️

- [ ] T042 [P] [US4] Écrire dans `tests/core/pieces.test.ts` : `setCorner` et `addCutout` sur plusieurs pièces, tout ou rien, message nommant la pièce refusée (FR-011)
- [ ] T043 [P] [US4] Compléter `tests/e2e/us6-shapes.spec.ts`, scénario F5 : une seule annulation, étagères regroupées sur une ligne (FR-011, FR-017)

### Implementation for User Story 4

- [ ] T044 [US4] Rendre `addCutout` atomique sur plusieurs pièces dans `src/core/pieces.ts`, et brancher les actions multiples dans `src/renderer/store.ts` (FR-011)
- [ ] T045 [US4] Dans `src/renderer/panels/ShapeEditor.tsx`, proposer pour plusieurs pièces uniquement les coins et l'ajout d'une découpe, sans aperçu manipulable (FR-011)

**Checkpoint**: F5 passe. Tous les parcours sont fonctionnels.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Vérifier l'ensemble, y compris ce que les tests automatiques ne prouvent pas.

- [ ] T046 Vérifier la compatibilité dans `tests/e2e/us6-shapes.spec.ts`, scénario F7 : `valid-v1.cotabois` s'ouvre à l'identique et ses exports ne changent pas (FR-022, FR-023, SC-006)
- [ ] T047 Rejouer F6 et les refus du jeu de formes impossibles dans `tests/e2e/us6-shapes.spec.ts` (FR-012, FR-013, SC-007)
- [ ] T048 [P] Mettre à jour `README.md` : arrondis et découpes dans la présentation, limites restantes
- [ ] T049 Mesurer F8 et rejouer F9 dans le logiciel empaqueté, puis construire l'installeur avec `npm run dist`, en consignant les résultats dans `specs/002-piece-shapes/checklists/validation.md` (SC-004, SC-005)
- [ ] T050 Faire chronométrer par l'utilisateur deux arrondis et une découpe au premier usage, et imprimer un plan pour vérifier qu'il suffit à fabriquer la pièce ; consigner dans `specs/002-piece-shapes/checklists/validation.md` (SC-001, SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance.
- **Foundational (Phase 2)** : dépend du Setup et bloque tous les parcours. T016 décide de la suite : si la fluidité n'est pas tenue, on corrige avant l'éditeur.
- **Parcours (Phases 3 à 6)** : dépendent de la phase 2, dans l'ordre de priorité.
- **Polish (Phase 7)** : dépend de tous les parcours.

### User Story Dependencies

- **US1 (P1)** : après la phase 2. Crée l'éditeur et l'aperçu.
- **US2 (P1)** : dépend de US1, dont il complète l'éditeur et l'aperçu.
- **US3 (P1)** : dépend de US1 pour le regroupement. Il peut avancer sur les coins seuls, mais son plan n'est complet qu'avec US2.
- **US4 (P3)** : dépend de US1 et US2.

### Within Each User Story

- Les tests sont écrits d'abord et doivent échouer avant l'implémentation.
- Le cœur vient avant l'état, puis l'interface.
- Un parcours est terminé quand ses tests passent et que son scénario de `quickstart.md` a été rejoué dans le logiciel.
- Pousser la branche à chaque point de contrôle vérifié.

### Parallel Opportunities

- Phase 1 : T001, T002 et T003.
- Phase 2 : T004 à T008. T004 et T005 touchent le même fichier et se font l'un après l'autre.
- Tests de chaque parcours : les tâches marquées [P], sauf quand elles complètent le même fichier.
- Les parcours partagent `pieces.ts`, `shape.ts` et `ShapeEditor.tsx` : ils se font à la suite.

---

## Parallel Example: Phase 2

```bash
# Tests à écrire ensemble :
Task: "Validation et géométrie de forme dans tests/core/shape.test.ts"
Task: "Format version 2 dans tests/core/projectFile.test.ts"
Task: "Conservation de la forme dans tests/core/pieces.test.ts"
Task: "Affichage dans tests/e2e/shapes-display.spec.ts"
```

---

## Implementation Strategy

### MVP First

1. Terminer les phases 1 et 2, et lever le risque de performance à T016.
2. Terminer l'US1 (phase 3).
3. **STOP and VALIDATE** : rejouer F1 avec `npm run dev`.
4. Terminer l'US2 (phase 4), puis l'US3 (phase 5) : **c'est le premier jalon réellement utile**, car on peut alors dessiner une pièce de forme et la fabriquer.

### Incremental Delivery

1. Fondations : une pièce de forme s'affiche, et le meuble reste fluide.
2. US1 : les coins.
3. US2 : les découpes.
4. US3 : les plans pour l'atelier.
5. US4 : les modifications groupées.

---

## Notes

- Une tâche marquée [P] touche des fichiers différents et ne dépend d'aucune tâche en attente.
- Les valeurs entre guillemets sont reprises de `data-model.md`.
- Les contours libres, les usinages partiels et les chants arrondis restent hors de cette liste.
