# Implementation Plan: Calepinage des panneaux

**Branch**: `claude/furniture-3d-modeling-app-ca615b` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-panel-layout/spec.md`

## Summary

À partir des pièces du meuble, le logiciel calcule, pour chaque matériau et épaisseur, combien de panneaux acheter et comment les découper, uniquement avec des coupes traversantes. Le calcul est un placement glouton répété avec un nombre d'essais fixé, en entiers et sans hasard réel, placé dans le cœur. Seuls les réglages sont enregistrés, dans un format de fichier version 3 ; le résultat est toujours recalculé. Une vue dédiée s'affiche à la place de la vue 3D, et un PDF séparé porte le plan de coupe. Les décisions sont détaillées dans [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 7.0, sur Node.js 26 LTS pour le développement

**Primary Dependencies**: Inchangées (Electron 45, Three.js 0.187, React 19) ; aucune nouvelle dépendance

**Storage**: Fichiers `.cotabois`, format version 3, migration depuis les versions 1 et 2

**Testing**: Vitest pour le cœur, Playwright pour les scénarios dans la vraie application, contrôle visuel du plan de coupe en PDF

**Target Platform**: Windows 10 et 11, 64 bits, carte graphique intégrée du niveau d'une Intel Iris Xe

**Project Type**: Application de bureau

**Performance Goals**: Calepinage de 200 pièces affiché en moins de 2 s (SC-005). Le prototype prend environ 350 ms au maximum

**Constraints**: Cotes exactes à 0,1 mm, calcul en entiers ; même résultat pour les mêmes données ; exports de la liste de découpe et projets existants inchangés

**Scale/Scope**: 200 pièces, une taille de panneau par matériau et épaisseur, une vue et un document

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 1.2.0. Le principe VI exige une spécification dédiée pour le calepinage : c'est celle-ci.

| Principe | Comment le plan le respecte | Vérifié par | Avant | Après conception |
|---|---|---|---|---|
| I. Un vrai logiciel, un clic | Rien ne change à l'installation | L9 | OK | OK |
| II. Local et hors ligne | Aucun réseau, aucune dépendance | Test existant du blocage | OK | OK |
| III. Un seul modèle, fait de panneaux | Le calepinage est calculé depuis `project.pieces` ; seuls les réglages s'ajoutent au projet, et aucune cote de pièce n'est copiée | Tests du cœur, L5 | OK | OK |
| IV. Des cotes exactes | Entiers, tests écrits avant le code sur des exemples calculés à la main, vérificateur indépendant du placement | Jeu de référence, L1 à L4 | OK | OK |
| V. Cœur séparé de l'interface | Réglages, placement et ordre des coupes dans `src/core` | Test d'architecture | OK | OK |
| VI. Simplicité d'abord | Aucune dépendance, pas de processus de calcul séparé, un seul algorithme, placement non modifiable | Relecture | OK | OK |
| Contraintes techniques | Pile, plateforme, langue et unité conformes | Relecture | OK | OK |
| Processus | Spec, plan, tâches, puis code ; test sans réinstaller | Ce dossier | OK | OK |

Aucune violation : la section Complexity Tracking n'est pas nécessaire.

## Project Structure

### Documentation (this feature)

```text
specs/003-panel-layout/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md
│   ├── project-file-v3.md
│   └── ui-and-exports.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Créé à l'étape suivante
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── model.ts         # Réglages dans Project
│   ├── guillotine.ts    # Nouveau : placement en coupes traversantes, sans notion de pièce ni de matériau
│   ├── layout.ts        # Nouveau : réglages, regroupement, résultat, regroupement des panneaux identiques
│   ├── cutList.ts       # materialKey exporté
│   └── projectFile.ts   # Version 3 et migration
├── main/
│   ├── menu.ts          # Commande d'export du plan de coupe
│   └── pdf.ts           # Titre de la fenêtre selon le document
└── renderer/
    ├── store.ts         # Vue ouverte ou fermée, réglages, export
    ├── App.tsx          # Bascule entre vue 3D et calepinage
    ├── panels/
    │   ├── LayoutView.tsx     # Nouveau : réglages, résumé, avertissements, panneaux
    │   └── LayoutDrawing.tsx  # Nouveau : dessin SVG d'un panneau, à l'écran et sur papier
    └── report/
        └── CuttingPlanReport.tsx  # Nouveau : document imprimé

tests/
├── core/                # guillotine.test.ts, layout.test.ts, format version 3
├── fixtures/            # Meubles de référence du calepinage, fichier en version 2
└── e2e/                 # us7-layout.spec.ts, performance étendue
```

**Structure Decision**: la structure des versions précédentes est conservée. `guillotine.ts` ne connaît que des rectangles entiers, ce qui permet de le tester seul sur des exemples calculés à la main. `layout.ts` fait le lien avec le projet.

## Ordre de construction

Les tâches détaillées viendront à l'étape suivante. L'ordre suit les priorités de la spec, avec les risques d'abord :

1. **Modèle et fichier** : réglages dans le projet, format version 3, sans changement visible.
2. **Placement** : `guillotine.ts`, avec le vérificateur indépendant, puis le jeu de référence et la mesure du temps.
3. **Nombre de panneaux (US1)** : regroupement, réglages, vue et résumé.
4. **Placement visible (US2)** : dessin à l'échelle, panneaux identiques regroupés.
5. **Atelier (US3)** : plan de coupe en PDF.
6. **Ordre des coupes (US4)** : numéros sur le dessin et tableau.
7. **Sens du fil (US5)** : réglage et avertissements.
8. **Finitions** : validation complète, installeur, contrôle visuel du plan imprimé.
