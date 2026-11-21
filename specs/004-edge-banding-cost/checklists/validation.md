# Résultats de validation : Chants et coût du meuble

**Purpose**: Consigner ce qui a réellement été vérifié, comment, et ce qui reste à faire
**Date**: 2026-11-21, finitions comprises
**Étape**: fin des tâches automatisables (T043) ; seuls les contrôles par une personne restent à faire (T044)
**Machine**: portable de développement, Windows 11 Pro, Intel Iris Xe, écran à 120 Hz
**Feature**: [spec.md](../spec.md), scénarios de [quickstart.md](../quickstart.md)

## Scénarios

| Scénario | Résultat | Comment |
|---|---|---|
| C1. Poser des chants | Réussi | Scénario automatique dans la vraie application, et capture de la vue 3D contrôlée à l'œil |
| C2. Cote à couper | Réussi | Scénario automatique : liste, cote finie, calepinage, épaisseur refusée |
| C3. Métrage | Réussi | Scénario automatique : 7,56 m, puis 7,42 m sans surlongueur |
| C4. Exports | Réussi | Scénario automatique sur le CSV, la liste imprimée et le plan de coupe ; documents contrôlés à l'œil |
| C5. Coût | Réussi | Scénario automatique : 64,33 €, puis 52,33 € en total partiel, prix conservés à l'enregistrement |
| C6. Saisies refusées | Réussi | Scénario automatique sur les prix ; surlongueur refusée dans C3 |
| C7. Caisson | Réussi | Scénario automatique : bords avant chantés, 7,56 m, puis plus aucun chant en décochant |
| C8. Compatibilité et performances | Réussi | Fichiers en versions 1 à 4 ouverts dans l'application ; mesure ci-dessous |
| C9. Empaqueté | Partiel | Caisson aux bords avant chantés et coût de 64,33 € dans `dist/win-unpacked`. Installeur construit (107,7 Mo), mais pas installé |

Bilan automatique : 673 tests du cœur et 69 scénarios réussis, dont ceux de la version empaquetée, types sans erreur. Les mesures de performance existantes restent dans leurs seuils.

## Mesures

| Mesure | Résultat | Objectif |
|---|---|---|
| Poser un chant sur 40 pièces à la fois, sur le projet de 200 pièces dont 50 de forme, jusqu'à l'image affichée (SC-005) | Médiane 18 ms, maximum 21 ms | Moins de 1 s |

La tâche visait 50 pièces : la plus grosse ligne de ce projet de test en compte 40.

## Valeurs calculées à la main

| Cas | Attendu | Obtenu |
|---|---|---|
| Bords avant du caisson de référence, sans surlongueur | 7,42 m | 7,42 m |
| Avec 20 mm de surlongueur | 7,56 m (3,64 + 3,92 m par ligne) | 7,56 m |
| Étagère de 764 × 395 avec un chant de 2 mm sur le bord bas | 764 × 393 | 764 × 393 |
| Exemple de coût de la spec | 98,23 € | 98,23 € |
| Coût du quickstart, puis sans le panneau de 5 mm | 64,33 €, puis 52,33 € partiel | 64,33 €, puis 52,33 € partiel |

## Contrôle visuel

Documents produits par le logiciel pour un caisson aux bords avant chantés, avec un chant de 2 mm et des prix : liste imprimée sur 1 page, plan de coupe sur 3 pages, CSV.

| Point | Résultat |
|---|---|
| Bande sur le bord avant des côtés, du dessus, du dessous et des étagères, en 3D | Conforme |
| Cote à couper et mention `fini …` dans la liste, à l'écran et imprimée | Conforme |
| Colonne `Chant` des totaux, seulement avec des chants | Conforme |
| Chant à acheter, coût de chaque achat et total dans le plan de coupe | Conforme |
| Cases des chants dans la colonne de gauche | Conforme après correction : elles se coupaient sur deux lignes |
| Libellés du tableau du coût | Conforme après correction : ils commençaient par une minuscule |
| Formulaire du caisson | Corrigé avant livraison : quitter un champ activait l'option des chants, repéré par le contrôle des types et un ancien scénario |
| Notes « Cotes finies » du plan de coupe et de la liste | Conforme après correction : elles disent désormais « Cotes à couper » quand un chant réduit une cote |

## Non vérifié

| Point | Qui | Comment |
|---|---|---|
| SC-001, premier usage chronométré | Utilisateur | Poser les chants d'un caisson et lire le métrage, sans documentation |
| Plan de coupe imprimé avec ses prix | Utilisateur | Taille du texte et lisibilité à l'atelier |
| Installation réelle avec la nouvelle version | Utilisateur | Lancer `dist/CotaBois Setup 0.1.0.exe`, puis refaire C3 et C5 |
