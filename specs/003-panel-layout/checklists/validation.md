# Résultats de validation : Calepinage des panneaux

**Purpose**: Consigner ce qui a réellement été vérifié, comment, et ce qui reste à faire
**Date**: 2026-11-19
**Étape**: fin des tâches automatisables (T038) ; seuls les contrôles par une personne restent à faire (T039)
**Machine**: portable de développement, Windows 11 Pro, Intel Iris Xe, écran à 120 Hz
**Feature**: [spec.md](../spec.md), scénarios de [quickstart.md](../quickstart.md)

## Scénarios

| Scénario | Résultat | Comment |
|---|---|---|
| L1. Nombre de panneaux | Réussi | Scénario automatique dans la vraie application, et dans la version empaquetée |
| L2. Plusieurs matériaux, pièce trop grande | Réussi | Scénario automatique |
| L3. Dessin | Réussi | Scénarios automatiques, et captures contrôlées à l'œil |
| L4. Marge et ajustements exacts | Réussi côté cœur | Cas calculés à la main, avec des marges de 0, 5 et 10 mm |
| L5. Suivi du meuble et annulation | Réussi | Scénario automatique |
| L6. Plan de coupe | Réussi, sauf l'impression | Scénarios automatiques, y compris empaqueté, et PDF contrôlés à l'œil |
| L7. Ordre des coupes et sens du fil | Réussi | Coupes rejouées par le vérificateur dans le cœur ; numéros, tableau et case du sens du fil dans des scénarios automatiques |
| L8. Compatibilité et performances | Réussi | Fichiers en versions 1, 2 et 3 ouverts dans l'application ; mesures ci-dessous |
| L9. Empaqueté | Partiel | L1 et L6 dans `dist/win-unpacked`. Installeur construit (107,7 Mo), mais pas installé |

Bilan automatique : 564 tests du cœur et 59 scénarios réussis, dont ceux de la version empaquetée, types sans erreur.

## Mesures

| Mesure | Résultat | Objectif |
|---|---|---|
| Meubles réalistes au meilleur résultat connu (SC-002) | 51 sur 56, soit 91 % ; jamais plus d'un panneau d'écart | Au moins 90 % |
| Placement de 200 pièces toutes différentes, dans le cœur | 100 ms | Moins de 1 s |
| Ouverture du calepinage de 200 pièces dont 50 de forme, dans l'application (SC-005) | Médiane 271 ms, maximum 389 ms | Moins de 2 s |
| Modification d'une cote et rotation de la vue, sur ce même projet | Inchangées : maximum 31 ms, 95 % des images en moins de 9 ms | Moins de 1 s, fluide |

Le meilleur résultat connu vient d'une recherche 20 fois plus longue (`tests/fixtures/layout-best-known.json`), pas d'une preuve du minimum. La marge au-dessus de 90 % est mince : 50 cas sur 56 feraient échouer le test.

## Contrôle visuel (T026 et finitions)

Vrais PDF produits par le logiciel, rendus en images et relus : un caisson simple sur 2 pages, et une cuisine sur 5 pages. La cuisine comprend trois matériaux, des taquets de 50 × 40 mm, une marge de 10 mm, le sens du fil, une pièce de forme et un plan de travail trop grand.

| Point | Résultat |
|---|---|
| Achats, sens du fil, réglages et avertissement en tête du document | Conforme |
| Panneaux identiques présentés une fois, avec `× 2` | Conforme |
| Un dessin n'est jamais coupé entre deux pages | Conforme |
| Petites pièces repérées par une lettre, avec une légende lisible | Conforme après correction : elles avaient des numéros, confondus avec ceux des coupes |
| Numéros de coupe sur leur ligne, tableau des distances | Conforme |
| Long tableau des coupes (46 coupes) | Conforme après correction : il continue sur la page suivante avec ses en-têtes, au lieu de repousser chaque panneau sur une nouvelle page (7 pages ramenées à 5) |
| Pièce de forme sur son rectangle, avec `Plan 1` | Conforme |
| Quatre panneaux de chêne avec le sens du fil, recomptés à la main | Conforme |
| Pièces étroites et hautes, comme les côtés d'un caisson | Conforme après correction : nom écrit à la verticale au lieu d'un numéro |
| Groupe sans aucun panneau | Conforme après correction : une phrase l'explique |
| Bouton du calepinage actif, à l'écran | Conforme après correction : il était illisible au survol |

Limite constatée : autour de pièces minuscules, comme les taquets de 50 × 40 mm, les numéros de coupe se serrent. Ils restent lisibles, et le tableau donne chaque coupe en clair.

## Non vérifié

| Point | Qui | Comment |
|---|---|---|
| SC-001, premier usage chronométré | Utilisateur | Obtenir le nombre de panneaux d'un meuble, sans documentation |
| SC-004, découpe à partir du plan imprimé | Utilisateur | Imprimer un plan de coupe et découper un meuble |
| Lecture à l'atelier, à la taille réelle de l'impression | Utilisateur | Taille du texte et des numéros sur papier |
| Installation réelle avec la nouvelle version | Utilisateur | Lancer `dist/CotaBois Setup 0.1.0.exe`, puis refaire L1 |
