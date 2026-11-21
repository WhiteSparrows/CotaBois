# Résultats de validation : Meuble à tiroirs

**Purpose**: Consigner ce qui a réellement été vérifié, comment, et ce qui reste à faire
**Date**: 2026-11-21
**Étape**: fin des tâches automatisables (T025) ; seuls les contrôles par une personne restent à faire (T026)
**Machine**: portable de développement, Windows 11 Pro
**Feature**: [spec.md](../spec.md), scénarios de [quickstart.md](../quickstart.md)

## Scénarios

| Scénario | Résultat | Comment |
|---|---|---|
| T1. Meuble de référence | Réussi | Scénario automatique : 7 lignes, 23 pièces, aucun chevauchement ; liste identique au calcul à la main dans les tests du cœur |
| T2. Arrondis | Réussi | Tests du cœur : façades de 237,3, 237,3 et 237,4 mm, côtés de 197,3 mm, sans chevauchement |
| T3. Refus | Réussi | Scénario automatique : « 7 au maximum », « 265 mm », largeur ; rien n'est créé. Un réglage replié refusé ouvre sa section |
| T4. Ajustement | Réussi | Scénario automatique : 4 tiroirs en une action, annulée ; confirmation après une retouche, renoncer puis remplacer |
| T5. Choix du modèle | Réussi | Scénario automatique : caisson identique à avant, confirmation avant de le remplacer, modèle et réglages retrouvés à la réouverture |
| T6. Chants et calepinage | Réussi | Scénario automatique : chants de la carcasse et des façades, trois groupes de 18, 15 et 5 mm ; 7,90 m de chant pour 16 bords, comme le calcul à la main |
| T7. Compatibilité | Réussi | Scénario automatique : fichiers en versions 1 à 4 affichés avec `Caisson`, version 5 avec son modèle |
| T8. Empaqueté | Partiel | Meuble de référence dans `dist/win-unpacked`. Installeur construit (107,7 Mo), mais pas installé |

Bilan automatique : 730 tests du cœur et 76 scénarios réussis, dont ceux de la version empaquetée, types sans erreur.

Pour US3 et US4, le code existait déjà à la fin de l'US1 : leurs tests ont confirmé son comportement après coup, au lieu d'échouer d'abord.

## Valeurs calculées à la main

| Cas | Attendu | Obtenu |
|---|---|---|
| Façades du meuble de référence | 3 × 597 × 237 | 3 × 597 × 237 |
| Boîtes : avant et arrière, côtés, fonds | 6 × 509 × 197, 6 × 500 × 197, 3 × 539 × 500 | Identiques |
| Tiroir du bas, au-dessus du dessous de 18 mm | Fond à 19 mm | 19 mm |
| Haut du tiroir 1, sous le dessus | 701 mm, sous 702 mm | 701 mm |
| Chant du meuble de référence, 20 mm de surlongueur | 2 × 740 + 2 × 584 + 3 × (2 × 617 + 2 × 257) = 7 892 mm, soit 7,90 m | 7,90 m (16 bords) |

## Contrôle visuel

Captures de la vraie application et documents produits par le logiciel pour le meuble de référence chanté : liste imprimée sur 1 page, plan de coupe sur 4 pages.

| Point | Résultat |
|---|---|
| Vue 3D : carcasse, trois façades en applique avec leurs jeux, tiroirs cachés derrière, chants visibles | Conforme |
| Liste à l'écran et imprimée, avec le résumé des chants par ligne | Conforme |
| Formulaire : sélecteur `Modèle`, réglages des tiroirs repliés, case des chants | Conforme |
| Message d'accueil de la vue 3D | Corrigé : il parlait seulement de créer un caisson |
| Barre d'outils au calepinage | Corrigé : repliée sur deux lignes, elle recouvrait le titre « Calepinage ». Le défaut existait déjà avant, il se voit sur les captures de la fonctionnalité précédente |
| Plan de coupe : trois épaisseurs, chant à acheter, ordre des coupes | Conforme |

## Écarts par rapport au plan

- Le formulaire décrit chaque modèle par sa liste de champs (`furnitureModels.ts`) au lieu de deux composants `CaissonFields` et `DrawerFields`.
- Un jeu entre façades de 0 mm est refusé avec un bois de 18 mm : le tiroir du bas toucherait le dessous. Il est accepté avec un bois plus fin.

## Non vérifié

| Point | Qui | Comment |
|---|---|---|
| SC-001, premier usage chronométré | Utilisateur | Créer un meuble à 3 tiroirs et lire sa liste, sans documentation, en moins de 2 minutes |
| SC-005, fabrication | Utilisateur | Fabriquer les tiroirs à partir de la seule liste, et vérifier qu'ils coulissent avec des coulisses de 500 mm |
| Installation réelle avec la nouvelle version | Utilisateur | Lancer `dist/CotaBois Setup 0.1.0.exe`, puis refaire T1 |
