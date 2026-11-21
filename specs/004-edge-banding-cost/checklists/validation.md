# Résultats de validation : Chants et coût du meuble

**Purpose**: Consigner ce qui a réellement été vérifié, comment, et ce qui reste à faire
**Date**: 2026-11-21
**Étape**: jalon de la fin de l'US3 (T035) ; l'option du caisson (US4) et les finitions restent à faire
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
| C7. Caisson | Pas encore construit | US4, après ce jalon |
| C8. Compatibilité et performances | Partiel | Migrations des versions 1 à 3 testées dans le cœur ; scénario complet et mesure en phase finale |
| C9. Empaqueté | Pas encore fait | Les tests empaquetés ont tourné sur une version antérieure, sans les chants |

Bilan automatique : 670 tests du cœur et 65 scénarios réussis, types sans erreur. Les mesures de performance existantes restent dans leurs seuils.

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
| Notes « Cotes finies » du plan de coupe et de la liste | Conforme après correction : elles disent désormais « Cotes à couper » quand un chant réduit une cote |

## Non vérifié

| Point | Qui | Comment |
|---|---|---|
| SC-001, premier usage chronométré | Utilisateur | Poser les chants d'un caisson et lire le métrage, sans documentation |
| Plan de coupe imprimé avec ses prix | Utilisateur | Taille du texte et lisibilité à l'atelier |
| Version empaquetée et installeur | Phase finale | T043 |
