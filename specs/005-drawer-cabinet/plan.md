# Implementation Plan: Meuble à tiroirs

**Branch**: `claude/furniture-3d-modeling-app-ca615b` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-drawer-cabinet/spec.md`

## Summary

Un second modèle de départ, le meuble à tiroirs, rejoint le caisson. `Template` devient une union de deux variantes, et la carcasse sans étagère est commune aux deux. Le cœur calcule les façades en applique et les boîtes de tiroir, en entiers, et les place en 3D, tiroirs fermés. Le formulaire de gauche choisit le modèle et affiche ses champs, avec des réglages avancés repliés. Le fichier passe en version 5. Les décisions sont détaillées dans [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 7.0, sur Node.js 26 LTS pour le développement

**Primary Dependencies**: Inchangées (Electron 45, Three.js 0.187, React 19) ; aucune nouvelle dépendance

**Storage**: Fichiers `.cotabois`, format version 5, migration depuis les versions 1 à 4

**Testing**: Vitest pour le cœur, Playwright pour les scénarios dans la vraie application, contrôle visuel en 3D

**Target Platform**: Windows 10 et 11, 64 bits, carte graphique intégrée du niveau d'une Intel Iris Xe

**Project Type**: Application de bureau

**Performance Goals**: Génération immédiate ; au plus 5 + 6 × 10 = 65 pièces pour 10 tiroirs, très en dessous des 200 pièces déjà mesurées

**Constraints**: Cotes exactes à 0,1 mm ; caisson et projets existants inchangés

**Scale/Scope**: Un modèle de plus, de 1 à 10 tiroirs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 1.2.0. Le principe III prévoit d'ajouter d'autres modèles de meubles sans réécrire le modèle : c'est le cas, une variante s'ajoute à `Template`.

| Principe | Comment le plan le respecte | Vérifié par | Avant | Après conception |
|---|---|---|---|---|
| I. Un vrai logiciel, un clic | Rien ne change à l'installation | T8 | OK | OK |
| II. Local et hors ligne | Rien ne change | Test existant du blocage | OK | OK |
| III. Un seul modèle, fait de panneaux | Le meuble à tiroirs génère des pièces ordinaires ; seuls ses réglages sont enregistrés à côté | Tests du cœur | OK | OK |
| IV. Des cotes exactes | Entiers, règles d'arrondi écrites, tests écrits avant le code sur des meubles calculés à la main | Jeu de référence, T1, T2 | OK | OK |
| V. Cœur séparé de l'interface | Génération, validation et placement dans `src/core` | Test d'architecture | OK | OK |
| VI. Simplicité d'abord | Aucune dépendance ; carcasse partagée avec le caisson ; un seul meuble par projet | Relecture | OK | OK |
| Contraintes techniques | Pile, plateforme, langue et unité conformes | Relecture | OK | OK |
| Processus | Spec, plan, tâches, puis code ; test sans réinstaller | Ce dossier | OK | OK |

Aucune violation : la section Complexity Tracking n'est pas nécessaire.

## Project Structure

### Documentation (this feature)

```text
specs/005-drawer-cabinet/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md
│   ├── project-file-v5.md
│   └── ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Créé à l'étape suivante
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── model.ts         # DrawerParams, Template en union
│   ├── caisson.ts       # Carcasse commune, exportée
│   ├── drawers.ts       # Nouveau : validation, génération, placement
│   ├── templates.ts     # Nouveau : applyTemplate, aiguillage par modèle
│   └── projectFile.ts   # Version 5
└── renderer/
    ├── store.ts                    # applyTemplateParams
    ├── App.tsx                     # Le formulaire de modèle remplace CaissonForm
    └── panels/
        ├── FurnitureForm.tsx       # Nouveau : choix du modèle et confirmation
        ├── CaissonFields.tsx       # Champs du caisson, extraits de CaissonForm
        └── DrawerFields.tsx        # Nouveau : champs du meuble à tiroirs

tests/
├── core/                # drawers.test.ts, templates.test.ts, format version 5
├── fixtures/            # Meubles à tiroirs calculés à la main, fichier en version 5
└── e2e/                 # us9-drawers.spec.ts
```

**Structure Decision**: chaque modèle a son fichier de génération, et `templates.ts` est le seul endroit qui les connaît tous. Ajouter un troisième modèle reviendra à ajouter une variante, un fichier et ses champs.

## Ordre de construction

Les tâches détaillées viendront à l'étape suivante. L'ordre suit les priorités de la spec, avec les risques d'abord :

1. **Modèle et fichier** : `Template` en union, format version 5, sans changement visible ; le caisson reste identique.
2. **Génération (US1)** : cotes, placement et refus, sur des meubles calculés à la main ; c'est le principal risque.
3. **Ajustement (US2)** : régénération et confirmation.
4. **Choix du modèle (US3)** : formulaire et champs.
5. **Chants (US4)** : option de création.
6. **Finitions** : compatibilité, contrôle visuel en 3D, installeur.
