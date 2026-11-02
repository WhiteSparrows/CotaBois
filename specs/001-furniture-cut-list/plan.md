# Implementation Plan: Conception de meubles et liste de découpe

**Branch**: `claude/furniture-3d-modeling-app-ca615b` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-furniture-cut-list/spec.md`

## Summary

CotaBois est un logiciel de bureau Windows, installable et lancé d'un clic, qui transforme les dimensions d'un meuble en vue 3D et en liste de découpe exacte, exportable en PDF et en CSV.

L'approche repose sur un cœur métier pur en TypeScript, qui calcule tout en entiers (dixièmes de millimètre) et se teste sans fenêtre. Autour de lui, une application Electron avec une interface React et une vue 3D Three.js. Pendant le développement, le logiciel se lance depuis les sources, avec mise à jour automatique : l'installeur n'est vérifié que pour une version livrée. Le modèle est prévu pour accueillir plus tard d'autres meubles et d'autres formes, sans les construire maintenant. Les décisions sont détaillées dans [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 7.0, sur Node.js 26 LTS pour le développement

**Primary Dependencies**: Electron 45, Three.js 0.187, React 19, electron-vite 6 avec Vite 8, electron-builder 26

**Storage**: Fichiers JSON `.cotabois`, à l'emplacement choisi par l'utilisateur ; aucune base de données

**Testing**: Vitest 5 pour le cœur, Playwright 1.64 pour les scénarios dans la vraie application, vérifications manuelles pour la fluidité et l'installeur

**Target Platform**: Windows 10 et 11, 64 bits, carte graphique intégrée du niveau d'une Intel Iris Xe

**Project Type**: Application de bureau

**Performance Goals**: Utilisable en moins de 5 s après le double-clic, mise à jour en moins de 1 s et rotation fluide sur un meuble de 200 pièces

**Constraints**: Hors ligne et sans compte ; cotes exactes à 0,1 mm ; installeur sans logiciel supplémentaire ; interface en français, en millimètres

**Scale/Scope**: Un utilisateur, un projet ouvert à la fois, jusqu'à environ 200 pièces par meuble, une fenêtre principale

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Comment le plan le respecte | Vérifié par | Avant | Après conception |
|---|---|---|---|---|
| I. Un vrai logiciel, un clic | Installeur NSIS par utilisateur, icônes, aucune console | Scénario V7 à chaque version livrée | OK | OK |
| II. Local et hors ligne | Aucune fonction réseau, requêtes `http(s)` bloquées dans la version empaquetée, projets en fichiers ordinaires | Test du blocage, scénario V7 | OK | OK |
| III. Un seul modèle, fait de panneaux | Vue 3D et liste calculées depuis `Project` ; `shape` et `template` à variantes, `formatVersion` et migrations | Tests du cœur, format de [project-file.md](contracts/project-file.md) | OK | OK |
| IV. Des cotes exactes | Entiers en dixièmes de mm, saisies invalides refusées, tests écrits avant le code sur des meubles calculés à la main | Jeu de référence, scénarios V1 et V2 | OK | OK |
| V. Cœur séparé de l'interface | `src/core` sans dépendance, l'interface ne passe que par lui | Test d'architecture sur les imports | OK | OK |
| VI. Simplicité d'abord | Pas de formes libres ni de calepinage ; pas de bibliothèque PDF ou de validation ; dépendances justifiées dans `research.md` | Relecture | OK | OK |
| Contraintes techniques | Pile, plateforme, langue et unité conformes | Relecture | OK | OK |
| Processus : tester sans réinstaller | `npm test`, `npm run dev` et `npm run pack` sans installation | [quickstart.md](quickstart.md) | OK | OK |

Aucune violation : la section Complexity Tracking n'est pas nécessaire.

Réserve : la compatibilité de la chaîne d'outils n'est encore qu'une lecture des versions déclarées. Elle doit être prouvée par le squelette du projet, voir [research.md](research.md), R15.

## Project Structure

### Documentation (this feature)

```text
specs/001-furniture-cut-list/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md
│   ├── desktop-bridge.md
│   ├── exports.md
│   └── project-file.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Créé à l'étape suivante
```

### Source Code (repository root)

```text
src/
├── core/                # Cœur métier pur : aucun import d'Electron, Three.js ou React
│   ├── units.ts         # Dixièmes de mm, saisie et affichage
│   ├── model.ts         # Types et validation de Project et Piece
│   ├── caisson.ts       # Génération et contraintes du caisson
│   ├── pieces.ts        # Ajouter, dupliquer, supprimer, modifier, pivoter
│   ├── geometry.ts      # Encombrement, chevauchements, alignement
│   ├── cutList.ts       # Regroupement, tri et totaux
│   ├── csv.ts           # Export CSV
│   ├── projectFile.ts   # Lecture, écriture et migrations
│   └── history.ts       # Annuler et rétablir
├── main/                # Processus principal Electron
│   ├── index.ts         # Fenêtre, sécurité, blocage réseau
│   ├── files.ts         # Dialogues, lecture, écriture atomique
│   ├── pdf.ts           # Impression en PDF
│   └── menu.ts          # Menu français et raccourcis
├── preload/
│   └── index.ts         # API window.cotabois
└── renderer/            # Interface
    ├── index.html
    ├── main.tsx
    ├── App.tsx
    ├── store.ts         # EditorState, seul point d'appel des modifications du cœur
    ├── viewport/        # Scène Three.js, caméra, sélection, poignées, capture d'image
    ├── panels/          # Formulaire du caisson, propriétés, liste de découpe, totaux
    └── report/          # Vue de rapport pour le PDF

tests/
├── core/                # Tests du cœur, écrits avant le code
├── fixtures/            # Meubles de référence, projet de 200 pièces, fichiers .cotabois
├── architecture.test.ts # Vérifie les imports de src/core
└── e2e/                 # Scénarios Playwright dans la vraie application

build/                   # Icône et ressources de l'installeur
electron.vite.config.ts
electron-builder.yml
package.json
tsconfig.json
```

**Structure Decision**: un seul paquet, séparé selon les trois cibles d'Electron (`main`, `preload`, `renderer`), plus `core`. Il n'y a pas de monorepo : le cœur n'a qu'un seul consommateur, et le test d'architecture suffit à faire respecter sa séparation.

## Ordre de construction

Les tâches détaillées viendront à l'étape suivante. L'ordre suit les priorités de la spec, avec une exigence : la chaîne complète doit fonctionner dès le début.

1. **Squelette** : une fenêtre vide qui se lance avec `npm run dev`, se teste avec `npm test` et s'empaquette avec `npm run dist`. Cela lève les risques de R15 et couvre le gros de l'US2.
2. **US1** : cœur du caisson et de la liste de découpe, tests d'abord, puis formulaire, vue 3D et liste.
3. **US3** : modification des pièces, sélection, poignées, alignement, chevauchements, annulation.
4. **US4** : fichier de projet et question à la fermeture.
5. **US5** : exports CSV et PDF.
6. **Finitions** : blocage réseau vérifié, icône définitive, mesures de performance, scénario V7.
