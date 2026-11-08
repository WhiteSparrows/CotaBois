# Résultats de validation : Pièces de forme

**Purpose**: Consigner ce qui a réellement été vérifié, comment, et ce qui reste à faire
**Date**: 2026-11-08
**Étape**: jalon de la fin de l'US3 (T041) ; l'US4 et les finitions restent à faire
**Machine**: portable de développement, Windows 11 Pro, Intel Iris Xe, écran à 120 Hz
**Feature**: [spec.md](../spec.md), scénarios de [quickstart.md](../quickstart.md)

## Scénarios

| Scénario | Résultat | Comment |
|---|---|---|
| F1. Arrondir | Réussi | Scénario automatique dans la vraie application |
| F2. Découper | Réussi | Scénario automatique : découpes, glissements, limites, clic à travers un trou |
| F3. Assemblage | Réussi | Scénario automatique, et cas exacts dans les tests du cœur |
| F4. Regroupement et plan | Réussi, sauf l'impression | Scénarios automatiques, et PDF contrôlés à l'œil |
| F5. Plusieurs pièces | Pas encore construit | US4, après ce jalon |
| F6. Modifier une pièce de forme | Réussi côté cœur | Rotation, copie et changement de dimension testés dans le cœur ; scénario complet en phase finale |
| F7. Compatibilité | Réussi côté cœur | Migration et projets en version 1 testés dans le cœur ; scénario complet en phase finale |
| F8. Performances | Réussi | Mesures ci-dessous |
| F9. Empaqueté | Partiel | Lancement et scénario existant dans la version empaquetée ; F1, F2 et F4 à y rejouer en phase finale |

## Mesures

Sur 200 pièces dont 50 de forme, à partir de `200-pieces-shapes.cotabois` :

| Mesure | Résultat | Objectif |
|---|---|---|
| Modification d'une cote, jusqu'à l'image suivante | Médiane 15 ms, maximum 23 ms | Moins de 1 s |
| Rotation de la vue | 95 % des images en moins de 9 ms, soit le rythme de l'écran | Fluide |

## Contrôle visuel des plans (T041)

Vrais PDF produits par le logiciel, puis rendus en images et relus : un rapport de 4 pages, 3 plans, dont une pièce à 13 éléments.

| Point | Résultat |
|---|---|
| Rapport sans interface parasite, marges blanches | Conforme |
| Un plan n'est pas coupé entre deux pages | Conforme |
| Numéros sans chevauchement, découpes visibles | Conforme après correction |
| Texte de taille constante, quelle que soit l'échelle du dessin | Conforme après correction |
| Deux pièces retournées partagent un plan, avec leur quantité | Conforme |

Ce contrôle a trouvé deux défauts que les tests automatiques ne voyaient pas : des numéros qui se chevauchaient ou cachaient de petits trous, et un texte minuscule sur les pièces presque carrées.

## Non vérifié

| Point | Qui | Comment |
|---|---|---|
| SC-001, premier usage chronométré | Utilisateur | Deux arrondis et une découpe, sans documentation |
| SC-003, fabrication à partir du plan imprimé | Utilisateur | Imprimer un plan et vérifier qu'il suffit |
| Correspondance entre l'aperçu et la pièce en 3D | Utilisateur | Voir si l'on sait quel coin est lequel |
| Glissements à la vraie souris | Utilisateur | Testés par des événements souris simulés |
| Chevauchements autour des courbes | Personne | Approchés à environ 1 mm, par conception |
