# Quickstart: Conception de meubles et liste de découpe

Guide pour lancer le logiciel et vérifier qu'il respecte la [spec](spec.md). Les commandes décrivent ce que le projet doit proposer une fois le squelette en place.

## Prérequis

- Windows 11, ou Windows 10 en 64 bits.
- Node.js 26 LTS, à installer une seule fois pour développer :

```bash
winget install OpenJS.NodeJS.LTS
```

Puis, à la racine du projet :

```bash
npm ci
```

## Commandes

| Commande | Rôle | Fréquence |
|---|---|---|
| `npm test` | Tests du cœur métier, sans fenêtre | À chaque modification |
| `npm run typecheck` | Vérification des types | Avant de valider |
| `npm run dev` | Ouvre la vraie fenêtre, mise à jour automatique | Espace de test quotidien |
| `npm run test:e2e` | Scénarios d'acceptation dans la vraie application | Avant de terminer une fonctionnalité |
| `npm run pack` | Logiciel empaqueté, sans installeur, dans `dist/win-unpacked` | Pour vérifier la version empaquetée |
| `npm run dist` | Installeur Windows dans `dist/` | Pour une version livrée |

Aucune de ces commandes, sauf `dist` et son installeur, n'exige d'installer CotaBois.

## Scénarios de validation

### V1. Le calcul de référence (US1, SC-003)

Avec `npm run dev`, créer un caisson de 800 × 1800 × 400 mm, en bois de 18 mm, avec un fond de 5 mm et 3 étagères.

**Résultat attendu** :

| Quantité | Cotes (mm) |
|---|---|
| 2 | 1800 × 395 × 18 |
| 5 | 764 × 395 × 18 |
| 1 | 1800 × 800 × 5 |

La vue 3D montre 8 pièces. Passer le fond à 0 : la ligne du fond disparaît et les profondeurs passent de 395 à 400. Le reste du jeu de référence est vérifié par `npm test`, dans `tests/core`.

### V2. Les saisies refusées (US1-5, cas limites)

Sur le même caisson, saisir tour à tour une largeur de 30 mm, une profondeur de `abc`, une épaisseur de `18,55` et 2000 étagères.

**Résultat attendu** : un message explique chaque refus, le meuble ne change pas, et le message sur les étagères donne le nombre maximal possible.

### V3. Ajuster en 3D (US3)

Partir d'un projet vide et construire une table : un plateau de 1200 × 700 × 30 mm et quatre pieds de 720 × 60 × 60 mm, placés avec les poignées et l'alignement, sans saisir les positions.

**Résultat attendu** :

- deux lignes de découpe (1 plateau, 4 pieds) ;
- pieds alignés exactement sur le plateau, sans jeu dans les positions affichées ;
- un quart de tour sur un pied ne change pas la liste ;
- Ctrl+Z puis Ctrl+Y ramènent exactement aux états précédents ;
- deux pièces superposées sont signalées.

### V4. Reprendre un projet (US4, SC-006)

Enregistrer le meuble, fermer le logiciel et rouvrir le fichier : la liste est identique. Modifier une cote puis fermer : la question de FR-024 apparaît. Ouvrir un fichier `.txt` renommé en `.cotabois` : un message s'affiche et le projet en cours reste intact.

### V5. Exporter (US5, SC-009)

Exporter le meuble de V1 en PDF et en CSV.

**Résultat attendu** : le PDF correspond à [exports.md](contracts/exports.md) et reste lisible une fois imprimé en noir et blanc. Le CSV s'ouvre dans Excel avec une colonne par information, accents et virgules corrects.

### V6. Les performances (SC-002, SC-004, SC-005)

Sur le portable de référence, avec le projet de test de 200 pièces de `tests/fixtures` :

- le logiciel est utilisable en moins de 5 secondes après le double-clic ;
- une modification de cote est reflétée en moins d'une seconde ;
- faire tourner la vue reste fluide.

### V7. L'installeur et l'absence de réseau (US2, SC-007, SC-008)

À faire pour une version livrée, sur un Windows sans outil de développement, comme Windows Sandbox :

1. Couper le réseau.
2. Lancer l'installeur issu de `npm run dist` : il se termine en moins de 2 minutes, sans rien demander d'autre.
3. Double-cliquer sur l'icône du bureau : aucune console n'apparaît.
4. Rejouer V1 et V5.
5. Désinstaller par les paramètres de Windows : le logiciel disparaît et les fichiers `.cotabois` restent.
