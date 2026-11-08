# Implementation Plan: Pièces de forme : arrondis et découpes

**Branch**: `claude/furniture-3d-modeling-app-ca615b` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-piece-shapes/spec.md`

## Summary

Une pièce peut désormais avoir des coins arrondis ou chanfreinés, des encoches et des trous traversants, tous définis par des cotes, retranchés de son rectangle. L'approche ajoute une variante de forme au modèle existant, validée en entiers dans le cœur. Une géométrie extrudée remplace la boîte pour ces seules pièces, un éditeur à plat manipulable à la souris permet de les modifier, et le PDF reçoit un plan coté par forme. Les décisions sont détaillées dans [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 7.0, sur Node.js 26 LTS pour le développement

**Primary Dependencies**: Inchangées (Electron 45, Three.js 0.187, React 19) ; aucune nouvelle dépendance

**Storage**: Fichiers `.cotabois`, format version 2, migration depuis la version 1

**Testing**: Vitest pour le cœur, Playwright pour les scénarios dans la vraie application, contrôle visuel des plans PDF

**Target Platform**: Windows 10 et 11, 64 bits, carte graphique intégrée du niveau d'une Intel Iris Xe

**Project Type**: Application de bureau

**Performance Goals**: Mise à jour en moins de 1 s et rotation fluide sur 200 pièces dont 50 de forme

**Constraints**: Cotes de forme exactes à 0,1 mm ; projets existants inchangés ; meuble sans forme strictement identique à aujourd'hui

**Scale/Scope**: Jusqu'à 50 découpes par pièce, un éditeur, un plan par forme distincte

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 1.2.0, amendée pour cette fonctionnalité : le principe III décrit désormais une pièce comme un panneau plat auquel on peut retirer des coins et des découpes.

| Principe | Comment le plan le respecte | Vérifié par | Avant | Après conception |
|---|---|---|---|---|
| I. Un vrai logiciel, un clic | Rien ne change à l'installation | F9 | OK | OK |
| II. Local et hors ligne | Aucun réseau, aucune dépendance | Test existant du blocage | OK | OK |
| III. Un seul modèle, fait de panneaux | Forme dans `Piece`, vue 3D, liste et plans calculés depuis elle ; contours libres et usinages exclus | Tests du cœur | OK | OK |
| IV. Des cotes exactes | Entiers, validation entière, tests écrits avant le code sur un jeu calculé à la main | Jeu de référence, F1 à F4 | OK | OK |
| V. Cœur séparé de l'interface | Validation, contour, chevauchements et clés dans `src/core` | Test d'architecture | OK | OK |
| VI. Simplicité d'abord | Aucune dépendance, numéros et tableau plutôt que lignes de cote automatiques | Relecture | OK | OK |
| Contraintes techniques | Pile, plateforme, langue et unité conformes | Relecture | OK | OK |
| Processus | Spec, plan, tâches, puis code ; test sans réinstaller | Ce dossier | OK | OK |

Aucune violation : la section Complexity Tracking n'est pas nécessaire.

## Project Structure

### Documentation (this feature)

```text
specs/002-piece-shapes/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md
│   ├── project-file-v2.md
│   └── ui-and-exports.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Créé à l'étape suivante
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── model.ts         # Variante ShapedShape
│   ├── shape.ts         # Nouveau : validation, contour, contenu, clé canonique, description
│   ├── pieces.ts        # setCorner, addCutout, updateCutout, removeCutout ; revalidation
│   ├── geometry.ts      # Chevauchements selon la forme réelle
│   ├── cutList.ts       # Regroupement par forme, numéros de plan
│   ├── csv.ts           # Colonne Plan
│   └── projectFile.ts   # Version 2 et migration
└── renderer/
    ├── store.ts         # Actions de forme, éditeur ouvert ou fermé
    ├── viewport/
    │   ├── Viewport.ts      # Pièces de forme, matrice d'orientation
    │   └── shapeMesh.ts     # Nouveau : géométrie extrudée et cache
    ├── panels/
    │   ├── PiecePanel.tsx   # Bouton Modifier la forme
    │   ├── ShapeEditor.tsx  # Nouveau : champs des coins et des découpes
    │   ├── ShapePreview.tsx # Nouveau : aperçu SVG et glissements
    │   └── CutListPanel.tsx # Mention Plan n
    └── report/
        └── ShapePlan.tsx    # Nouveau : plan coté du PDF

tests/
├── core/                # shape.test.ts, chevauchements, regroupement, format version 2
├── fixtures/            # Formes de référence, fichier en version 2, projet de 200 pièces étendu
└── e2e/                 # us6-shapes.spec.ts, performance étendue
```

**Structure Decision**: la structure de la première version est conservée. Toute la géométrie de forme est dans le nouveau `src/core/shape.ts`, seul fichier à connaître le détail des découpes, ce qui respecte le principe V et facilitera les évolutions annoncées.

## Ordre de construction

Les tâches détaillées viendront à l'étape suivante. L'ordre suit les priorités de la spec, avec les risques d'abord :

1. **Modèle et fichier** : variante de forme, validation, format version 2, sans changement visible.
2. **Affichage** : pièces de forme en 3D, à partir d'un fichier d'exemple, et mesure des performances, le principal risque.
3. **Arrondis (US1)** : éditeur, champs et aperçu.
4. **Découpes (US2)** : encoches, trous, glissements et chevauchements réels.
5. **Atelier (US3)** : regroupement, plans PDF et colonne CSV.
6. **Réutilisation (US4)** : plusieurs pièces à la fois.
7. **Finitions** : validation complète, installeur, contrôle visuel des plans.
