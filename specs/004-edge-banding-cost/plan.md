# Implementation Plan: Chants et coût du meuble

**Branch**: `claude/furniture-3d-modeling-app-ca615b` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-edge-banding-cost/spec.md`

## Summary

Chaque pièce porte la liste de ses bords chantés. Le chant de chaque matériau, sa surlongueur et les prix rejoignent les réglages du calepinage. Le cœur en déduit la cote à couper, le métrage de chant et le coût, en entiers : dixièmes de millimètre pour les longueurs, centimes pour les montants. La liste de découpe, le calepinage et les exports utilisent la cote à couper ; la vue 3D marque les bords chantés. Le fichier passe en version 4. Les décisions sont détaillées dans [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 7.0, sur Node.js 26 LTS pour le développement

**Primary Dependencies**: Inchangées (Electron 45, Three.js 0.187, React 19) ; aucune nouvelle dépendance

**Storage**: Fichiers `.cotabois`, format version 4, migration depuis les versions 1 à 3

**Testing**: Vitest pour le cœur, Playwright pour les scénarios dans la vraie application, contrôle visuel des exports

**Target Platform**: Windows 10 et 11, 64 bits, carte graphique intégrée du niveau d'une Intel Iris Xe

**Project Type**: Application de bureau

**Performance Goals**: Après la pose d'un chant, vue 3D, liste et coût à jour en moins de 1 s sur 200 pièces (SC-005)

**Constraints**: Cotes exactes à 0,1 mm et montants exacts au centime, sans flottant ; un meuble sans chant donne les mêmes documents qu'aujourd'hui ; projets existants inchangés

**Scale/Scope**: 4 bords par pièce, un chant et deux prix par matériau et épaisseur, une surlongueur commune

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 1.2.0. Les chants ne changent pas la forme d'une pièce : le principe III n'a pas besoin d'être amendé.

| Principe | Comment le plan le respecte | Vérifié par | Avant | Après conception |
|---|---|---|---|---|
| I. Un vrai logiciel, un clic | Rien ne change à l'installation | C9 | OK | OK |
| II. Local et hors ligne | Les prix sont saisis, jamais récupérés en ligne | Test existant du blocage | OK | OK |
| III. Un seul modèle, fait de panneaux | Les chants sont dans `Piece` ; cote à couper, métrage et coût sont calculés, jamais enregistrés | Tests du cœur | OK | OK |
| IV. Des cotes exactes | Cotes en dixièmes, montants en centimes, arrondis définis ; tests écrits avant le code sur des exemples calculés à la main | Jeu de référence, C1 à C6 | OK | OK |
| V. Cœur séparé de l'interface | Chants, cotes à couper, métrage et coût dans `src/core` | Test d'architecture | OK | OK |
| VI. Simplicité d'abord | Aucune dépendance, un chant par matériau, aucun tarif intégré | Relecture | OK | OK |
| Contraintes techniques | Pile, plateforme et langue conformes ; le millimètre reste l'unité des cotes | Relecture | OK | OK |
| Processus | Spec, plan, tâches, puis code ; test sans réinstaller | Ce dossier | OK | OK |

Aucune violation : la section Complexity Tracking n'est pas nécessaire.

## Project Structure

### Documentation (this feature)

```text
specs/004-edge-banding-cost/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md
│   ├── project-file-v4.md
│   └── ui-and-exports.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Créé à l'étape suivante
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── model.ts         # Bords chantés dans Piece, option du caisson, réglages étendus
│   ├── edges.ts         # Nouveau : bords, cote à couper, résumé, clé canonique, métrage
│   ├── cost.ts          # Nouveau : coût par achat, total, ce qui manque
│   ├── units.ts         # Euros en centimes, mètres arrondis au centimètre supérieur
│   ├── shape.ts         # Clé canonique commune de la forme et des chants
│   ├── pieces.ts        # setEdges ; cotes à couper revalidées après un changement de dimension
│   ├── caisson.ts       # Option des bords avant
│   ├── cutList.ts       # Cotes à couper, cotes finies, chants, métrage par ligne
│   ├── csv.ts           # Colonnes des chants, seulement s'il y en a
│   ├── layout.ts        # Pièces placées à leur cote à couper ; chant et prix du panneau
│   └── projectFile.ts   # Version 4 et migration
└── renderer/
    ├── store.ts                   # Actions des chants et des prix
    ├── viewport/Viewport.ts       # Bande colorée sur les bords chantés
    ├── panels/PiecePanel.tsx      # Cases des quatre bords
    ├── panels/CaissonForm.tsx     # Case des bords avant
    ├── panels/CutListPanel.tsx    # Cote finie, chants, métrage dans les totaux
    ├── panels/LayoutView.tsx      # Chant, prix, surlongueur, coût du meuble
    └── report/                    # Liste de découpe et plan de coupe imprimés

tests/
├── core/                # edges.test.ts, cost.test.ts, et compléments des tests existants
├── fixtures/            # Meubles de référence chantés et chiffrés, fichier en version 4
└── e2e/                 # us8-edges-cost.spec.ts, performance étendue
```

**Structure Decision**: la structure des versions précédentes est conservée. `edges.ts` est le seul fichier à connaître la géométrie des bords, et `cost.ts` le seul à manipuler des montants.

## Ordre de construction

Les tâches détaillées viendront à l'étape suivante. L'ordre suit les priorités de la spec, avec les risques d'abord :

1. **Modèle et fichier** : bords chantés, réglages étendus, format version 4, sans changement visible.
2. **Cœur des chants** : cote à couper, clé canonique, métrage, sur des exemples calculés à la main ; c'est le principal risque, car la cote à couper change la liste et le calepinage.
3. **Poser des chants (US1)** : panneau de la pièce, vue 3D, liste.
4. **Métrage (US2)** : réglages du chant, totaux, exports.
5. **Coût (US3)** : prix, coût du meuble, plan de coupe.
6. **Caisson (US4)** : option des bords avant.
7. **Finitions** : compatibilité, performances, installeur, contrôle visuel.
