---

description: "Liste des tâches pour les chants et le coût du meuble"
---

# Tasks: Chants et coût du meuble

**Input**: Design documents from `specs/004-edge-banding-cost/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Inclus, car le principe IV de la constitution impose d'écrire les tests avant le code pour toute règle qui produit ou modifie une cote. Ici, cela vaut aussi pour les montants. Écrire ces tests et vérifier qu'ils échouent avant d'implémenter. Chaque valeur attendue est calculée à la main.

**Organization**: Les tâches sont groupées par parcours utilisateur. Le cœur (cote à couper, clé de regroupement, métrage) est construit dans les fondations, avant toute interface : c'est lui qui change la liste de découpe et le calepinage.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut être fait en parallèle (fichiers différents, aucune dépendance en attente)
- **[Story]**: Parcours utilisateur concerné (US1 à US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Les données de référence, calculées à la main, dont dépendent tous les tests.

- [ ] T001 [P] Créer `tests/fixtures/edge-references.ts` : le caisson de référence (800 × 1800 × 400, fond de 5, 3 étagères) avec ses bords avant chantés, et ses résultats calculés à la main : 74 200 dixièmes de chant sans surlongueur (7,42 m), 75 600 avec 200 de surlongueur (7,56 m) ; cotes à couper avec un chant de 20 dixièmes (764 × 393 pour un chant sur le bord bas, 760 × 395 pour les bords gauche et droit, 760 × 393 pour les trois) ; coûts de la spec (2 panneaux à 4 590 c et 756 cm à 85 c/m : 9 180 + 643 = 9 823 c) et du quickstart (4 590 + 643 + 1 200 = 6 433 c, puis 5 233 c sans le dernier prix)
- [ ] T002 [P] Créer `tests/fixtures/projects/valid-v4.cotabois` selon `contracts/project-file-v4.md` : caisson avec `frontEdges`, réglages de chant et de prix, et des pièces avec et sans chant

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modèle, unités, format de fichier, et cœur des chants : cote à couper, clé de regroupement, métrage.

**⚠️ CRITICAL**: Aucun parcours ne commence avant la fin de cette phase.

### Tests ⚠️

> **NOTE: Écrire ces tests d'abord et vérifier qu'ils échouent avant d'implémenter.**

- [ ] T003 [P] Écrire dans `tests/core/units.test.ts` : `parseEuros` accepte `45,90`, `45.9`, `45`, `1 234,50` et `12 €`, refuse `-3`, `12,345`, `abc` et `100 000,01` avec une explication ; `formatEuros` donne `45,90 €`, `0,00 €` et `1 234,50 €` avec des espaces insécables ; `formatMeters` arrondit au centimètre supérieur (74 200 → `7,42 m`, 74 201 → `7,43 m`, 0 → `0,00 m`) (FR-009, FR-012)
- [ ] T004 [P] Écrire dans `tests/core/projectFile.test.ts` : aller-retour strictement égal des chants, des réglages et de `frontEdges` ; migration des versions 1, 2 et 3 vers des valeurs neutres ; format exact de `valid-v4.cotabois` ; refus avec `file-corrupted` d'un bord inconnu ou en double, d'un prix négatif ou décimal, d'un prix hors « Entier de 0 à 10 000 000 (100 000 €), ou absent », d'une `edgeThickness` hors « Entier de 0 à 100 (10 mm) », d'une `edgeOverhang` hors « Entier de 0 à 1000 (100 mm) », d'une cote à couper inférieure à 0,1 mm et d'un `frontEdges` non booléen ; refus d'une version supérieure à 4. Adapter les tests qui attendent la version 3, y compris `tests/e2e/us4-project.spec.ts` (FR-017, FR-018)
- [ ] T005 [P] Écrire `tests/core/edges.test.ts` : `cutSize` sur les exemples de `edge-references.ts` ; `edgeSummary` (`1 long`, `2 longs, 1 court`, `4 bords`, une pièce saisie plus large que longue dont les bords longs sont gauche et droit) ; `edgeLength` avec et sans surlongueur ; `checkCutSizes` qui nomme la pièce ; `setEdges` sur plusieurs pièces, atomique, qui marque le caisson comme retouché ; chants conservés par rotation, duplication, copier-coller et changement de dimension ; `updatePiece` qui refuse une dimension, un matériau ou une épaisseur donnant une cote à couper inférieure à 0,1 mm (FR-001, FR-002, FR-005, FR-007, FR-008)
- [ ] T006 [P] Écrire dans `tests/core/shape.test.ts` les cas de `canonicalPieceKey` : vide pour un rectangle sans chant ; identique sous demi-tour et retournement ; différente pour des chants différents ; pour un carré, deux bords voisins et deux bords opposés différents ; pour une tablette arrondie en haut, un chant en haut et un chant en bas différents (FR-004)

### Implementation

- [ ] T007 Étendre `src/core/model.ts` : `EdgeName`, `Piece.edges`, `CaissonParams.frontEdges`, `LayoutSettings.edgeOverhang` (200 par défaut), `PanelStock.edgeThickness`, `panelPrice` et `edgePrice` ; valider les bords dans `validatePiece` ; ajouter `edges` dans `newPanelInput` et la génération du caisson ; adapter les pièces et paramètres écrits à la main dans les tests et `tests/fixtures/reference-furniture.ts`
- [ ] T008 [P] Ajouter `parseEuros`, `formatEuros` et `formatMeters` dans `src/core/units.ts`, en entiers (FR-009, FR-012)
- [ ] T009 Créer `src/core/edges.ts` : `NO_EDGES`, `cutSize`, `checkCutSizes`, `edgeSummary`, `edgeLength`, selon `contracts/core-api.md` (FR-007, FR-008)
- [ ] T010 Remplacer `canonicalShapeKey` par `canonicalPieceKey(shape, edges)` dans `src/core/shape.ts`, avec les mêmes normalisation et symétries pour les coins, les découpes et les bords (FR-004)
- [ ] T011 Étendre les réglages dans `src/core/layout.ts` : `edgeOverhang` dans `setLayoutOptions` ; `edgeThickness`, `panelPrice` et `edgePrice` dans `setPanelStock`, avec `checkCutSizes` sur le groupe ; bornes de `data-model.md` dans `validateLayoutSettings` (FR-006, FR-012)
- [ ] T012 Ajouter `setEdges` dans `src/core/pieces.ts`, et la vérification des cotes à couper dans `updatePiece` (FR-002, FR-005, FR-007)
- [ ] T013 Passer `src/core/projectFile.ts` en version 4 : lecture, validation et écriture des chants, des réglages et de `frontEdges`, migration des versions 1 à 3 (FR-017, FR-018)

**Checkpoint**: Un projet enregistre ses chants et ses prix, et le cœur calcule exactement les cotes à couper et le métrage. Rien ne change encore à l'écran.

---

## Phase 3: User Story 1 - Indiquer les chants d'une pièce (Priority: P1) 🎯 MVP

**Goal**: Poser des chants sur une ou plusieurs pièces, les voir en 3D et dans la liste, et découper à la bonne cote.

**Independent Test**: Poser un chant sur le bord avant des 5 pièces identiques d'un caisson, puis régler un chant de 2 mm (quickstart, C1 et C2).

### Tests for User Story 1 ⚠️

- [ ] T014 [P] [US1] Écrire dans `tests/core/cutList.test.ts` : lignes à la cote à couper, avec la cote finie ; résumé des chants ; pièces aux chants différents sur deux lignes, et pièces tournées d'un demi-tour sur une seule ; totaux de surface sur la cote à couper ; liste identique sans chant (FR-003, FR-004, FR-007, FR-019)
- [ ] T015 [P] [US1] Écrire dans `tests/core/layout.test.ts` : le calepinage place 764 × 393 pour l'étagère de la spec, et ne change pas avec une épaisseur de chant nulle (FR-007, FR-019)
- [ ] T016 [P] [US1] Écrire `tests/e2e/us8-edges-cost.spec.ts`, scénarios C1 et C2 : cases des bords, une seule annulation, repère `1 long`, bande en 3D, cote à couper et cote finie, épaisseur impossible refusée (FR-001, FR-002, FR-003, FR-007)

### Implementation for User Story 1

- [ ] T017 [US1] Mettre à jour `src/core/cutList.ts` : cote à couper, cote finie, résumé des chants, regroupement par `canonicalPieceKey` (FR-003, FR-004, FR-007)
- [ ] T018 [US1] Placer les pièces à leur cote à couper dans `computeLayout`, `src/core/layout.ts` (FR-007)
- [ ] T019 [US1] Ajouter l'action des chants dans `src/renderer/store.ts`, et la section Chants avec ses quatre cases, « long » ou « court », dans `src/renderer/panels/PiecePanel.tsx`, pour une ou plusieurs pièces (FR-001, FR-002, FR-003)
- [ ] T020 [US1] Dessiner une bande colorée sur chaque bord chanté dans `src/renderer/viewport/Viewport.ts`, rectangles et pièces de forme, selon `research.md`, R10 (FR-003)
- [ ] T021 [US1] Afficher dans `src/renderer/panels/CutListPanel.tsx` la cote à couper, la mention `fini …` et le repère des chants (FR-003, FR-007)
- [ ] T022 [US1] Ajouter le champ `Épaisseur du chant` de chaque groupe dans `src/renderer/panels/LayoutView.tsx`, avec le rappel d'une épaisseur nulle quand des chants sont posés (FR-006, FR-007)

**Checkpoint**: C1 et C2 passent. On sait quels bords plaquer, et les pièces se coupent à la bonne cote.

---

## Phase 4: User Story 2 - Savoir combien de chant acheter (Priority: P1)

**Goal**: Le métrage de chaque chant, à l'écran et dans tous les documents d'atelier.

**Independent Test**: Sur le caisson de référence aux bords avant chantés, lire 7,42 m puis 7,56 m (quickstart, C3 et C4).

### Tests for User Story 2 ⚠️

- [ ] T023 [P] [US2] Écrire dans `tests/core/cutList.test.ts` : nombre de bords et métrage de chaque total, métrage de chaque ligne, sur `edge-references.ts`, exacts au centimètre (FR-008, FR-009, SC-002)
- [ ] T024 [P] [US2] Écrire dans `tests/core/csv.test.ts` : colonnes `Chants`, `Longueur finie (mm)`, `Largeur finie (mm)` et `Chant (m)` seulement s'il y a des chants, contenu exact pour le caisson de référence, CSV inchangé sans chant (FR-010, FR-019)
- [ ] T025 [P] [US2] Compléter `tests/e2e/us8-edges-cost.spec.ts`, scénarios C3 et C4 : surlongueur, métrage, CSV exact, chants dans la liste imprimée et dans le plan de coupe (FR-008, FR-009, FR-010)

### Implementation for User Story 2

- [ ] T026 [US2] Ajouter les métrages aux lignes et aux totaux dans `src/core/cutList.ts` (FR-008)
- [ ] T027 [US2] Ajouter les colonnes des chants dans `src/core/csv.ts` (FR-010)
- [ ] T028 [US2] Ajouter `Surlongueur de chant` et la ligne `Chant : 7,56 m (7 bords)` dans `src/renderer/panels/LayoutView.tsx`, et la colonne `Chant` des totaux dans `src/renderer/panels/CutListPanel.tsx` (FR-008, FR-009)
- [ ] T029 [US2] Ajouter les cotes finies, les chants et les métrages dans `src/renderer/report/ReportView.tsx`, et la ligne de chant des achats dans `src/renderer/report/CuttingPlanReport.tsx`, seulement s'il y a des chants (FR-010, FR-019)
- [ ] T030 [US2] Produire de vrais PDF et un CSV avec des chants, les contrôler à l'œil, et les consigner dans `specs/004-edge-banding-cost/checklists/validation.md` (FR-010)

**Checkpoint**: C3 et C4 passent. On sait combien de chant acheter.

---

## Phase 5: User Story 3 - Estimer le prix du meuble (Priority: P2)

**Goal**: Le coût de chaque achat et le total, jamais présenté comme complet s'il manque un prix.

**Independent Test**: Saisir les prix du quickstart et lire 64,33 €, puis 52,33 € en total partiel (quickstart, C5 et C6).

### Tests for User Story 3 ⚠️

- [ ] T031 [P] [US3] Écrire `tests/core/cost.test.ts` : exemples de `edge-references.ts` (9 823 c ; 6 433 c ; 5 233 c partiel avec le panneau de 5 mm nommé) ; prix nul ; groupe sans panneau placé ; chant sans métrage absent ; arrondi au centime, demis vers le haut ; total égal à la somme des achats arrondis ; tous exacts au centime (FR-011, FR-013, FR-014, FR-015, SC-003)
- [ ] T032 [P] [US3] Compléter `tests/e2e/us8-edges-cost.spec.ts`, scénarios C5 et C6 : coût affiché, total partiel, saisies refusées, prix conservés après enregistrement et réouverture, coût dans le plan de coupe (FR-012, FR-013, FR-014, FR-017)

### Implementation for User Story 3

- [ ] T033 [US3] Créer `src/core/cost.ts` : `computeCost`, selon `data-model.md` et `research.md`, R6 et R8 (FR-011, FR-013, FR-014, FR-015)
- [ ] T034 [US3] Ajouter les champs `Prix du panneau` et `Prix du chant` de chaque groupe et la section **Coût du meuble** dans `src/renderer/panels/LayoutView.tsx`, avec les actions de `src/renderer/store.ts` (FR-012, FR-013, FR-014)
- [ ] T035 [US3] Ajouter prix, montants et total, marqué partiel s'il le faut, dans `src/renderer/report/CuttingPlanReport.tsx` (FR-013, FR-014)

**Checkpoint**: C5 et C6 passent. Le premier jalon utile est atteint : chants, métrage et coût.

---

## Phase 6: User Story 4 - Chants proposés pour un caisson (Priority: P3)

**Goal**: Une case du formulaire pose les chants des bords avant.

**Independent Test**: Créer un caisson avec puis sans l'option (quickstart, C7).

### Tests for User Story 4 ⚠️

- [ ] T036 [P] [US4] Écrire dans `tests/core/caisson.test.ts` : avec `frontEdges`, le bord `top` des côtés, du dessus, du dessous et des étagères est chanté, et le fond n'a aucun chant ; sans, aucune pièce n'a de chant et le caisson est identique à aujourd'hui (FR-016)
- [ ] T037 [P] [US4] Compléter `tests/e2e/us8-edges-cost.spec.ts`, scénario C7, avec le métrage de 7,56 m obtenu directement (FR-016)

### Implementation for User Story 4

- [ ] T038 [US4] Appliquer `frontEdges` dans `src/core/caisson.ts` (FR-016)
- [ ] T039 [US4] Ajouter la case `Chants sur les bords avant` dans `src/renderer/panels/CaissonForm.tsx` (FR-016)

**Checkpoint**: C7 passe. Tous les parcours sont fonctionnels.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Vérifier l'ensemble, y compris ce que les tests automatiques ne prouvent pas.

- [ ] T040 Compléter `tests/e2e/us8-edges-cost.spec.ts`, scénario C8 : les fichiers en versions 1, 2, 3 et 4 s'ouvrent, les trois premiers sans chant ni prix, avec une liste identique (FR-018, SC-004)
- [ ] T041 Étendre `tests/e2e/v6-performance.spec.ts` : sur `200-pieces-shapes.cotabois`, poser un chant sur 50 pièces et mesurer la mise à jour, en moins de 1 s (SC-005)
- [ ] T042 [P] Mettre à jour `README.md` : chants et coût dans la présentation, et leurs limites
- [ ] T043 Compléter `tests/e2e/us2-packaged.spec.ts` avec C3 et C5 dans le logiciel empaqueté, exécuter `npm run pack` puis toute la suite, construire l'installeur avec `npm run dist`, et consigner les résultats dans `specs/004-edge-banding-cost/checklists/validation.md` (C9)
- [ ] T044 Faire chronométrer par l'utilisateur la pose des chants d'un caisson et la lecture du métrage, et vérifier un plan de coupe imprimé avec ses prix ; consigner dans `specs/004-edge-banding-cost/checklists/validation.md` (SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance.
- **Foundational (Phase 2)** : dépend du Setup et bloque tous les parcours.
- **Parcours (Phases 3 à 6)** : dépendent de la phase 2, dans l'ordre de priorité.
- **Polish (Phase 7)** : dépend de tous les parcours.

### User Story Dependencies

- **US1 (P1)** : après la phase 2.
- **US2 (P1)** : dépend de US1, dont il complète la liste et la vue de calepinage.
- **US3 (P2)** : dépend de US2 pour le métrage du chant.
- **US4 (P3)** : dépend de la phase 2 seulement ; son test de métrage suppose US2.

### Within Each User Story

- Les tests sont écrits d'abord et doivent échouer avant l'implémentation.
- Le cœur vient avant l'état, puis l'interface.
- Un parcours est terminé quand ses tests passent et que son scénario de `quickstart.md` a été rejoué dans le logiciel.
- Pousser la branche à chaque point de contrôle vérifié.

### Parallel Opportunities

- Phase 1 : T001 et T002.
- Phase 2 : T003 à T006, puis T008 avec T007.
- Tests de chaque parcours : les tâches marquées [P]. Celles qui complètent `cutList.test.ts` ou `us8-edges-cost.spec.ts` se font l'une après l'autre.
- Les parcours partagent `cutList.ts`, `LayoutView.tsx` et les rapports : ils se font à la suite.

---

## Parallel Example: Phase 2

```bash
# Tests à écrire ensemble :
Task: "Euros et mètres dans tests/core/units.test.ts"
Task: "Format version 4 dans tests/core/projectFile.test.ts"
Task: "Cotes à couper et métrage dans tests/core/edges.test.ts"
Task: "Clé canonique commune dans tests/core/shape.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Terminer les phases 1 et 2.
2. Terminer l'US1 (phase 3).
3. **STOP and VALIDATE** : rejouer C1 et C2 avec `npm run dev`.
4. Terminer l'US2 (phase 4), puis l'US3 (phase 5) : **c'est le premier jalon réellement utile**, car on sait alors quoi plaquer, combien de chant acheter et combien coûte le meuble.

### Incremental Delivery

1. Fondations : chants enregistrés et cœur exact.
2. US1 : les chants posés et les cotes à couper.
3. US2 : le métrage.
4. US3 : le coût.
5. US4 : l'option du caisson.

---

## Notes

- Une tâche marquée [P] touche des fichiers différents et ne dépend d'aucune tâche en attente.
- Les valeurs entre guillemets sont reprises de `data-model.md`.
- Plusieurs chants par matériau, la largeur du chant, la quincaillerie et le coût de la matière seule restent hors de cette liste.
