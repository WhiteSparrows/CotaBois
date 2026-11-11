# Résultats de validation : Calepinage des panneaux

**Purpose**: Consigner ce qui a réellement été vérifié, comment, et ce qui reste à faire
**Date**: 2026-11-11
**Étape**: jalon de la fin de l'US3 (T026) ; l'affichage de l'ordre des coupes, la case du sens du fil et les finitions restent à faire
**Machine**: portable de développement, Windows 11 Pro, Intel Iris Xe, écran à 120 Hz
**Feature**: [spec.md](../spec.md), scénarios de [quickstart.md](../quickstart.md)

## Scénarios

| Scénario | Résultat | Comment |
|---|---|---|
| L1. Nombre de panneaux | Réussi | Scénario automatique dans la vraie application |
| L2. Plusieurs matériaux, pièce trop grande | Réussi | Scénario automatique |
| L3. Dessin | Réussi | Scénarios automatiques, et captures contrôlées à l'œil |
| L4. Marge et ajustements exacts | Réussi côté cœur | Cas calculés à la main, avec des marges de 0, 5 et 10 mm |
| L5. Suivi du meuble et annulation | Réussi | Scénario automatique |
| L6. Plan de coupe | Réussi, sauf l'impression | Scénarios automatiques, et PDF contrôlés à l'œil |
| L7. Ordre des coupes et sens du fil | Réussi côté cœur | Les coupes sont rejouées par le vérificateur ; numéros, tableau et case du sens du fil restent à afficher |
| L8. Compatibilité et performances | Partiel | Migrations testées dans le cœur ; mesure dans la vraie application en phase finale |
| L9. Empaqueté | Pas encore fait | Les tests empaquetés ont tourné sur une version antérieure, sans le calepinage |

Bilan automatique : 564 tests du cœur et 54 scénarios réussis, types sans erreur.

## Mesures

| Mesure | Résultat | Objectif |
|---|---|---|
| Meubles réalistes au meilleur résultat connu (SC-002) | 51 sur 56, soit 91 % ; jamais plus d'un panneau d'écart | Au moins 90 % |
| Placement de 200 pièces toutes différentes, dans le cœur | 100 ms | Moins de 1 s |
| Ouverture du calepinage d'une cuisine de 53 pièces, dans l'application | 9 ms jusqu'au premier panneau dessiné | Moins de 2 s |

Le meilleur résultat connu vient d'une recherche 20 fois plus longue (`tests/fixtures/layout-best-known.json`), pas d'une preuve du minimum. La marge au-dessus de 90 % est mince : 50 cas sur 56 feraient échouer le test.

## Contrôle visuel (T026)

Vrais PDF produits par le logiciel, rendus en images et relus : un caisson simple sur 2 pages, et une cuisine sur 3 pages. La cuisine comprend trois matériaux, des taquets de 50 × 40 mm, une marge de 10 mm, le sens du fil, une pièce de forme et un plan de travail trop grand.

| Point | Résultat |
|---|---|
| Achats, réglages et avertissement en tête du document | Conforme |
| Panneaux identiques présentés une fois, avec `× 2` | Conforme |
| Un panneau n'est jamais coupé entre deux pages | Conforme |
| Petites pièces numérotées, avec une légende lisible | Conforme |
| Pièce de forme sur son rectangle, avec `Plan 1` | Conforme |
| Quatre panneaux de chêne avec le sens du fil, recomptés à la main | Conforme |
| Pièces étroites et hautes, comme les côtés d'un caisson | Conforme après correction : nom écrit à la verticale au lieu d'un numéro |
| Groupe sans aucun panneau | Conforme après correction : une phrase l'explique |
| Bouton du calepinage actif, à l'écran | Conforme après correction : il était illisible au survol |

## Non vérifié

| Point | Qui | Comment |
|---|---|---|
| SC-001, premier usage chronométré | Utilisateur | Obtenir le nombre de panneaux d'un meuble, sans documentation |
| SC-004, découpe à partir du plan imprimé | Utilisateur | Imprimer un plan de coupe et découper un meuble |
| Lecture à l'atelier, à la taille réelle de l'impression | Utilisateur | Taille du texte sur papier |
| Version empaquetée et installeur | Phase finale | T038 |
