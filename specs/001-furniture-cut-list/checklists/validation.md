# Résultats de validation : Conception de meubles et liste de découpe

**Purpose**: Consigner ce qui a réellement été vérifié, comment, et ce qui reste à faire
**Date**: 2026-11-02
**Machine**: portable de développement, Windows 11 Pro, Intel Iris Xe, écran à 120 Hz
**Feature**: [spec.md](../spec.md), scénarios de [quickstart.md](../quickstart.md)

## Scénarios

| Scénario | Résultat | Comment |
|---|---|---|
| V1. Le calcul de référence | Réussi | Scénario automatique dans la vraie application, et jeu de 5 caissons calculés à la main |
| V2. Les saisies refusées | Réussi | Scénario automatique |
| V3. Ajuster en 3D | Réussi | Scénario automatique : table construite aux poignées, pieds alignés à des cotes exactes |
| V4. Reprendre un projet | Réussi, boîtes de dialogue simulées | Scénario automatique, avec fermeture et réouverture du logiciel |
| V5. Exporter | Réussi, sauf l'impression | PDF contrôlés à l'œil (1 et 3 pages), CSV comparé à l'octet près, format lu par Excel |
| V6. Les performances | Réussi | Mesures ci-dessous, à confirmer à l'œil pour la fluidité |
| V7. L'installeur et l'absence de réseau | Partiel | Cycle complet sur la machine de développement, avec réseau ; Windows vierge à faire |

## Critères de réussite

| Critère | Résultat | Mesure |
|---|---|---|
| SC-001. Liste de découpe en moins de 2 minutes, sans documentation | **À faire** | Chronométrage par l'utilisateur |
| SC-002. Utilisable en moins de 5 s | Atteint | Environ 0,9 s au plus sur 5 lancements ; 0,7 s pour le logiciel installé. Fichiers déjà en cache : un premier lancement après redémarrage sera plus lent |
| SC-003. 100 % des cotes exactes | Atteint | Jeu de référence calculé à la main |
| SC-004. Mise à jour en moins de 1 s sur 200 pièces | Atteint | Médiane 14 ms, maximum 17 ms sur 9 modifications, à l'image suivante près |
| SC-005. Rotation fluide sur 200 pièces | Atteint selon la mesure | 95 % des images en moins de 9 ms, soit la fréquence de l'écran. Mesure côté interface : le travail de la carte graphique n'y est qu'indirectement visible |
| SC-006. Projet rouvert identique | Atteint | Aller-retour strictement égal, liste identique après réouverture |
| SC-007. Installation en moins de 2 min, sans autre logiciel | Partiel | 10 s en mode silencieux, sur la machine de développement ; Windows vierge à faire |
| SC-008. Tout fonctionne sans réseau | Partiel | Requêtes bloquées et vérifiées dans la version empaquetée ; essai réseau coupé à faire |
| SC-009. Découper depuis le seul PDF imprimé | **À faire** | Le contenu est complet, mais rien n'a été imprimé |

## Installeur sur la machine de développement

| Étape | Résultat |
|---|---|
| Installation silencieuse | 10 s, sans droits administrateur |
| Raccourcis du bureau et du menu Démarrer | Créés |
| Logiciel installé | Démarre, crée un caisson et enregistre un projet |
| Désinstallation | Logiciel, raccourcis, entrée Windows et cache retirés |
| Projet enregistré dans Documents | Conservé après la désinstallation |

Mode silencieux uniquement : ce qu'affiche Windows lors d'un double-clic sur l'installeur reste à voir.

## Instabilité observée

Le scénario V2 (`tests/e2e/us1-caisson.spec.ts`) a échoué une fois, sur une attente expirée, lors d'une exécution de la suite complète. Il a ensuite réussi 12 fois de suite seul, puis 5 fois avec les autres scénarios, sans reproduire l'échec. Le message d'erreur n'a pas été conservé : **la cause n'est pas connue**. La machine était chargée (4,5 Go de mémoire libre sur 31,7), mais rien ne relie les deux. Si l'échec revient, conserver la sortie complète de Playwright.

## Non vérifié

| Point | Qui | Comment |
|---|---|---|
| SC-001, premier usage chronométré | Utilisateur | Installer, lancer, créer un caisson sans documentation |
| SC-009, impression | Utilisateur | Imprimer le PDF, en noir et blanc si possible |
| Boîtes de dialogue Windows réelles | Utilisateur | Enregistrer et ouvrir un projet, exporter ; `Documents` doit être proposé |
| Raccourcis au clavier réel | Utilisateur | `Ctrl+Z`, `Ctrl+Y`, `Ctrl+D`, `Ctrl+S`, `Ctrl+O`, `Ctrl+N` |
| Fluidité perçue | Utilisateur | Ouvrir `tests/fixtures/projects/200-pieces.cotabois` et faire tourner la vue |
| V7 sur un Windows vierge, réseau coupé | Utilisateur | Windows Sandbox, à activer par l'utilisateur |
| Windows 10 | Personne pour l'instant | Aucune machine disponible |
| Disque plein, dossier protégé | Personne pour l'instant | Message prévu, mais seul le dossier inexistant est testé |
