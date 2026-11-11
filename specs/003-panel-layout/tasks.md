---

description: "Liste des tâches pour le calepinage des panneaux"
---

# Tasks: Calepinage des panneaux

**Input**: Design documents from `specs/003-panel-layout/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Inclus, car le principe IV de la constitution impose d'écrire les tests avant le code pour toute règle qui produit ou modifie une cote. Écrire ces tests et vérifier qu'ils échouent avant d'implémenter. Tout résultat de placement produit par un test passe par un vérificateur indépendant, qui n'importe rien de l'algorithme.

**Organization**: Les tâches sont groupées par parcours utilisateur. L'algorithme est construit et mesuré dans les fondations, avant toute interface : c'est le principal risque.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut être fait en parallèle (fichiers différents, aucune dépendance en attente)
- **[Story]**: Parcours utilisateur concerné (US1 à US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Les données de référence et le vérificateur, dont dépendent tous les tests.

- [X] T001 [P] Créer `tests/fixtures/layout-references.ts` : cas calculés à la main avec leur nombre de panneaux attendu (4 × 1000 × 500 sur 2000 × 1000 : trait 0 → 1, trait 3 → 2, trait 3 et sens du fil → 4 ; pièce égale au panneau → 1 ; deux pièces de 998,5 × 1000 avec un trait de 3 sur 2000 × 1000 → 1 ; 9 × 800 × 400 sur 2500 × 1250, trait 3 → 1 ; 1980 × 980 avec une marge de 10 → 1 ; 3000 × 500 sur 2800 × 2070 → non placée), et un générateur déterministe de meubles réalistes (cuisines, bibliothèques, dressings, tiroirs, de 1 à 20 caissons, panneaux de 2800 × 2070 et 2500 × 1250) pour SC-002
- [X] T002 [P] Créer `tests/fixtures/projects/valid-v3.cotabois` selon `contracts/project-file-v3.md`, avec un trait de scie, une marge et deux panneaux enregistrés, dont un avec sens du fil
- [X] T003 [P] Créer `tests/core/layoutChecker.ts`, sans aucun import de `src/core/guillotine.ts` ni de `src/core/layout.ts` : il vérifie les cinq invariants de `data-model.md` sur des placements, des chutes et des coupes, en rejouant les coupes une à une sur des rectangles (FR-007, FR-016, SC-003)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Réglages enregistrés, format de fichier, algorithme de placement, et preuve de sa qualité et de sa rapidité.

**⚠️ CRITICAL**: Aucun parcours ne commence avant la fin de cette phase.

### Tests ⚠️

> **NOTE: Écrire ces tests d'abord et vérifier qu'ils échouent avant d'implémenter.**

- [X] T004 [P] Écrire dans `tests/core/projectFile.test.ts` : aller-retour des réglages strictement égal, migration des versions 1 et 2 vers les réglages par défaut, format exact de la version 3 avec `layout` entre `template` et `pieces` et panneaux triés, refus d'un réglage invalide (`kerf` « Entier de 0 à 200 », `edgeMargin` « Entier de 0 à 1000 », dimensions de panneau, « Au plus une entrée par couple matériau et épaisseur »), refus d'une version supérieure à 3, puis adapter les tests existants qui attendent la version 2, y compris `tests/e2e/us4-project.spec.ts` (FR-004, FR-020)
- [X] T005 [P] Écrire `tests/core/guillotine.test.ts` : chaque cas de `layout-references.ts` donne le nombre attendu et passe le vérificateur ; même résultat sur deux appels ; ajustement exact accepté ; reste inférieur ou égal au trait sans chute ; aucune rotation quand `rotate` est faux ; index non placés renvoyés ; aucune exception sans élément ni avec un élément trop grand (FR-005, FR-007, FR-009, FR-010, FR-011)
- [X] T006 [P] Écrire dans `tests/core/layout.test.ts` les réglages : valeurs par défaut (trait 30, marge 0, panneau 28 000 × 20 700 sans sens du fil), `setLayoutOptions` et `setPanelStock` appliquent ou refusent sans modifier avec une explication, marge refusée si « `2 × edgeMargin` » n'est pas « strictement inférieur à la longueur et à la largeur » de chaque panneau, en nommant le panneau, matériau reconnu par `materialKey`, caisson non marqué comme retouché (FR-002, FR-003, FR-004)

### Implementation

- [X] T007 Ajouter dans `src/core/model.ts` les types `LayoutSettings` et `PanelStock`, le champ `layout` de `Project` et les réglages par défaut dans `createEmptyProject`. Vérifier que `src/core/caisson.ts` et `src/core/pieces.ts` conservent `layout`, et adapter les projets écrits à la main dans `tests/core/model.test.ts`, `tests/core/geometry.test.ts`, `tests/core/caisson.test.ts` et `tests/core/projectFile.test.ts`
- [X] T008 [P] Exporter `materialKey` depuis `src/core/cutList.ts`, sans changer son comportement (FR-001)
- [X] T009 Créer `src/core/layout.ts`, partie réglages : `defaultLayoutSettings`, `setLayoutOptions`, `setPanelStock`, `validateLayoutSettings`, selon `contracts/core-api.md` (FR-002, FR-003, FR-004)
- [X] T010 Passer `src/core/projectFile.ts` en version 3 : lecture, validation et écriture de `layout`, migration des versions 1 et 2 (FR-004, FR-020)
- [X] T011 Créer `src/core/guillotine.ts` : `packPanels` selon `research.md`, R1 à R3 et R6. Essais systématiques (6 tris, 3 choix, 6 règles de coupe, 2 parcours), puis reprise du panneau le moins rempli, générateur à graine fixe, nombre d'essais `min(4000, budget / nombre de pièces)`, score pièces non placées, puis panneaux, puis plus grande chute. Chaque panneau renvoie ses placements, ses chutes et ses coupes dans l'ordre d'un parcours préfixe, avec leur distance au bord du morceau (FR-005, FR-007, FR-009, FR-011, FR-016)
- [X] T012 Créer `tests/core/layoutQuality.test.ts`. Un mode réservé, activé par la variable `COTABOIS_BEST_KNOWN=1`, calcule le meilleur résultat connu des meubles réalistes avec un budget 20 fois plus grand et l'écrit dans `tests/fixtures/layout-best-known.json`. Le test normal exige au moins 90 % de résultats égaux et jamais plus d'un panneau d'écart (SC-002), et moins de 1 s pour 200 pièces toutes différentes dans le cœur seul (SC-005). Si un seuil n'est pas tenu, corriger avant de continuer

**Checkpoint**: Un projet enregistre ses réglages, et l'algorithme place correctement les cas de référence, assez bien et assez vite. Le principal risque est levé.

---

## Phase 3: User Story 1 - Savoir combien de panneaux acheter (Priority: P1) 🎯 MVP

**Goal**: Pour chaque matériau et épaisseur, le nombre de panneaux, leur taille et l'utilisation du bois, avec les pièces non placées.

**Independent Test**: Sur 4 pièces de 1000 × 500 mm et des panneaux de 2000 × 1000 mm, obtenir 1 panneau sans trait de scie et 2 avec 3 mm (quickstart, L1 et L2).

### Tests for User Story 1 ⚠️

- [X] T013 [P] [US1] Écrire dans `tests/core/layout.test.ts` les cas de `computeLayout` : un groupe par couple de la clé des totaux et dans leur ordre, panneau par défaut sans réglage, nombre de panneaux, `formatUsage` arrondi à la décimale inférieure (`100 %`, `87,3 %`), pièces placées sur pièces du groupe, pièce trop grande nommée avec `reason` `too-large` et `complete` faux, marge retirée de la surface utile, projet vide sans groupe, projet inchangé ; tous les résultats passent le vérificateur (FR-001, FR-010, FR-013, FR-019)
- [X] T014 [P] [US1] Écrire `tests/e2e/us7-layout.spec.ts`, scénarios L1, L2 et L5 : bascule de vue, réglages, résumé, avertissement, résultat qui suit une modification de pièce, annulation d'un réglage, caisson non retouché d'après le fichier enregistré (FR-004, FR-012, FR-013)

### Implementation for User Story 1

- [X] T015 [US1] Compléter `src/core/layout.ts` : `computeLayout`, regroupement, appel de `packPanels` sur la surface utile, décalage par la marge, pièces non placées, `formatUsage` (FR-001, FR-008, FR-010, FR-013)
- [X] T016 [US1] Ajouter dans `src/renderer/store.ts` l'état d'ouverture du calepinage et les actions de réglage, une action annulable par réglage (FR-004)
- [X] T017 [US1] Ajouter la commande `view:layout` dans `src/main/menu.ts`, menu Affichage, et la bascule Vue 3D / Calepinage dans la barre d'outils de `src/renderer/App.tsx`, le calepinage recouvrant la vue 3D sans la démonter (FR-012)
- [X] T018 [US1] Créer `src/renderer/panels/LayoutView.tsx`, avec ses styles dans `src/renderer/styles.css` : réglages communs, champs du panneau de chaque groupe, résumé, avertissements, mention sur l'absence de minimum garanti, message pour un meuble sans pièce ; résultat calculé avec `useMemo` sur le projet (FR-003, FR-009, FR-010, FR-012, FR-013)

**Checkpoint**: L1, L2 et L5 passent. On sait combien de panneaux acheter.

---

## Phase 4: User Story 2 - Voir où chaque pièce est placée (Priority: P1)

**Goal**: Chaque panneau dessiné à l'échelle, avec ses pièces, leurs cotes et les chutes.

**Independent Test**: Relever positions et cotes sur le dessin d'un caisson, et vérifier qu'aucune pièce ne manque ni ne se chevauche (quickstart, L3).

### Tests for User Story 2 ⚠️

- [X] T019 [P] [US2] Écrire dans `tests/core/layout.test.ts` : placements avec noms, identifiants et numéro de plan de forme ; `rotated` ; panneaux identiques regroupés avec leur quantité, même si les noms diffèrent ; chutes hors marge ; pièce de forme sur son rectangle complet (FR-008, FR-014, FR-015)
- [X] T020 [P] [US2] Compléter `tests/e2e/us7-layout.spec.ts`, scénario L3 : nombre de pièces dessinées, mention `Plan 1` sur la pièce arrondie, `× 2` sur des panneaux identiques (FR-014, FR-015)

### Implementation for User Story 2

- [X] T021 [US2] Compléter `src/core/layout.ts` : placements avec noms, identifiants et numéros de plan repris de `computeCutList`, chutes, regroupement des panneaux identiques (FR-008, FR-014, FR-015)
- [X] T022 [US2] Créer `src/renderer/panels/LayoutDrawing.tsx` : SVG à l'échelle, texte en millimètres de papier, nom et cotes ou numéro renvoyant à une légende, `↻`, `Plan n`, chutes et marge hachurées, selon `contracts/ui-and-exports.md` ; l'afficher dans `LayoutView.tsx` (FR-014, FR-015)

**Checkpoint**: L3 passe. Le dessin montre comment obtenir le résultat.

---

## Phase 5: User Story 3 - Emporter le plan de coupe à l'atelier (Priority: P1)

**Goal**: Un PDF séparé avec les panneaux à acheter, les réglages, les avertissements et un dessin coté par panneau.

**Independent Test**: Exporter le plan de coupe d'un meuble, l'imprimer, et découper ou simuler la découpe à partir du seul document (quickstart, L6).

### Tests for User Story 3 ⚠️

- [X] T023 [P] [US3] Écrire dans `tests/e2e/us7-layout.spec.ts`, scénario L6 : nom proposé `<projet> - plan de coupe.pdf`, un bloc par panneau distinct, avertissements présents si le résultat est incomplet, export désactivé sans pièce ; et vérifier dans `tests/e2e/us5-export.spec.ts` que le PDF et le CSV de la liste de découpe restent inchangés (FR-017, FR-018)

### Implementation for User Story 3

- [X] T024 [US3] Ajouter l'export du plan de coupe : commande `file:export-cutting-plan` dans `src/main/menu.ts`, titre de la fenêtre d'enregistrement selon le document dans `src/main/pdf.ts` et `src/preload/index.ts`, variante de `ReportContent` et action `exportCuttingPlan` dans `src/renderer/store.ts` (FR-017)
- [X] T025 [US3] Créer `src/renderer/report/CuttingPlanReport.tsx`, avec ses styles d'impression dans `src/renderer/report/report.css`, sans bloc coupé entre deux pages, et l'afficher selon la variante dans `src/renderer/App.tsx` (FR-017, FR-019)
- [X] T026 [US3] Produire de vrais PDF, un meuble simple et un meuble de plusieurs matériaux avec des petites pièces, et les contrôler à l'œil en les consignant dans `specs/003-panel-layout/checklists/validation.md` (SC-004)

**Checkpoint**: L6 passe. Le plan de coupe peut partir à l'atelier.

---

## Phase 6: User Story 4 - Suivre l'ordre des coupes (Priority: P2)

**Goal**: Des coupes numérotées, chacune avec la distance à reporter sur la scie.

**Independent Test**: Rejouer les coupes d'un panneau dans l'ordre et obtenir exactement les pièces prévues (quickstart, L7).

### Tests for User Story 4 ⚠️

- [X] T027 [P] [US4] Écrire dans `tests/core/layout.test.ts` : coupes numérotées à partir de 1 sur chaque panneau, distance au bord du morceau, quatre coupes de délignage en tête avec une marge, et aucune sans marge ; le vérificateur rejoue les coupes de tous les cas de référence (FR-016)
- [ ] T028 [P] [US4] Compléter `tests/e2e/us7-layout.spec.ts`, première partie de L7 : numéros sur le dessin et tableau des coupes dans le plan imprimé (FR-016)

### Implementation for User Story 4

- [X] T029 [US4] Compléter `src/core/layout.ts` : coupes de délignage et passage des coupes au repère du panneau complet (FR-016)
- [ ] T030 [US4] Ajouter les numéros de coupe, sans recouvrement, dans `src/renderer/panels/LayoutDrawing.tsx`, et le tableau des coupes dans `src/renderer/report/CuttingPlanReport.tsx` (FR-016)

**Checkpoint**: L7, première partie, passe. On sait dans quel ordre couper.

---

## Phase 7: User Story 5 - Respecter le sens du fil (Priority: P2)

**Goal**: Aucune pièce tournée pour un matériau dont le fil compte.

**Independent Test**: Avec 4 pièces de 1000 × 500 mm, un trait de 3 mm et des panneaux de 2000 × 1000 mm, obtenir 2 panneaux sans le fil et 4 avec (quickstart, L7).

### Tests for User Story 5 ⚠️

- [X] T031 [P] [US5] Écrire dans `tests/core/layout.test.ts` : avec le sens du fil, aucune rotation, `shape.length` suit la longueur du panneau même si elle est plus courte que la largeur, pièce qui ne rentrerait que tournée signalée avec `reason` `grain` ; sans le fil, rotation permise (FR-006)
- [ ] T032 [P] [US5] Compléter `tests/e2e/us7-layout.spec.ts`, seconde partie de L7 : case `Respecter le sens du fil`, 2 puis 4 panneaux, avertissement qui propose d'inverser longueur et largeur (FR-006)

### Implementation for User Story 5

- [X] T033 [US5] Compléter `src/core/layout.ts` : rotation selon le réglage du groupe, sur les cotes saisies de la pièce, et raison `grain` (FR-006, FR-010)
- [ ] T034 [US5] Ajouter la case `Respecter le sens du fil` et le texte de l'avertissement dans `src/renderer/panels/LayoutView.tsx`, et la mention du sens du fil dans `src/renderer/report/CuttingPlanReport.tsx` (FR-006)

**Checkpoint**: L7 passe entièrement. Tous les parcours sont fonctionnels.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Vérifier l'ensemble, y compris ce que les tests automatiques ne prouvent pas.

- [ ] T035 Compléter `tests/e2e/us7-layout.spec.ts`, scénario L8 : `valid-v1.cotabois`, `valid-v2.cotabois` et `valid-v3.cotabois` s'ouvrent à l'identique, les deux premiers avec les réglages par défaut, et la liste de découpe ne change pas (FR-020, SC-006)
- [ ] T036 Étendre `tests/e2e/v6-performance.spec.ts` : ouvrir `200-pieces-shapes.cotabois`, puis mesurer l'ouverture du calepinage jusqu'à l'image affichée, en moins de 2 s ; les mesures existantes restent dans leurs seuils (SC-005)
- [ ] T037 [P] Mettre à jour `README.md` : le calepinage dans la présentation, ses limites (une taille de panneau par matériau, coupes traversantes, minimum non garanti)
- [ ] T038 Compléter `tests/e2e/us2-packaged.spec.ts` avec L1 et L6 dans le logiciel empaqueté, exécuter `npm run pack` puis toute la suite, construire l'installeur avec `npm run dist`, et consigner les résultats dans `specs/003-panel-layout/checklists/validation.md` (L9)
- [ ] T039 Faire chronométrer par l'utilisateur l'obtention du nombre de panneaux au premier usage, et découper un meuble à partir du seul plan imprimé ; consigner dans `specs/003-panel-layout/checklists/validation.md` (SC-001, SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance.
- **Foundational (Phase 2)** : dépend du Setup et bloque tous les parcours. T012 décide de la suite : si la qualité ou le temps ne sont pas tenus, on corrige l'algorithme avant toute interface.
- **Parcours (Phases 3 à 7)** : dépendent de la phase 2, dans l'ordre de priorité.
- **Polish (Phase 8)** : dépend de tous les parcours.

### User Story Dependencies

- **US1 (P1)** : après la phase 2. Crée la vue et le calcul complet.
- **US2 (P1)** : dépend de US1, dont il complète la vue.
- **US3 (P1)** : dépend de US2, dont il réutilise le dessin.
- **US4 (P2)** : dépend de US2 pour le dessin et de US3 pour le tableau imprimé. Le cœur des coupes existe dès T011.
- **US5 (P2)** : dépend de US1 seulement ; il peut passer avant US4.

### Within Each User Story

- Les tests sont écrits d'abord et doivent échouer avant l'implémentation.
- Le cœur vient avant l'état, puis l'interface.
- Un parcours est terminé quand ses tests passent et que son scénario de `quickstart.md` a été rejoué dans le logiciel.
- Pousser la branche à chaque point de contrôle vérifié.

### Parallel Opportunities

- Phase 1 : T001, T002 et T003.
- Phase 2 : T004, T005 et T006, puis T008 avec T007.
- Tests de chaque parcours : les tâches marquées [P]. Celles qui complètent `layout.test.ts` ou `us7-layout.spec.ts` se font l'une après l'autre.
- Les parcours partagent `layout.ts`, `LayoutView.tsx` et `CuttingPlanReport.tsx` : ils se font à la suite.

---

## Parallel Example: Phase 2

```bash
# Tests à écrire ensemble :
Task: "Format version 3 dans tests/core/projectFile.test.ts"
Task: "Cas de référence de l'algorithme dans tests/core/guillotine.test.ts"
Task: "Réglages dans tests/core/layout.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Terminer les phases 1 et 2, et lever le risque de l'algorithme à T012.
2. Terminer l'US1 (phase 3).
3. **STOP and VALIDATE** : rejouer L1 et L2 avec `npm run dev`.
4. Terminer l'US2 (phase 4), puis l'US3 (phase 5) : **c'est le premier jalon réellement utile**, car on sait alors quoi acheter et on a un plan pour l'atelier.

### Incremental Delivery

1. Fondations : réglages enregistrés et algorithme validé.
2. US1 : le nombre de panneaux.
3. US2 : le dessin.
4. US3 : le plan de coupe imprimé.
5. US4 et US5 : l'ordre des coupes et le sens du fil.

---

## Notes

- Une tâche marquée [P] touche des fichiers différents et ne dépend d'aucune tâche en attente.
- Les valeurs entre guillemets sont reprises de `data-model.md`.
- Le prototype de `research.md` n'est pas dans le dépôt : `guillotine.ts` est écrit à partir des tests, pas recopié.
- Les stocks, les chutes réutilisées, le placement libre et le prix des panneaux restent hors de cette liste.
