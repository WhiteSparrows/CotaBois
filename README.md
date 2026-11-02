# CotaBois

CotaBois: enter your furniture's dimensions, and CotaBois automatically generates every piece you need to cut, from the main panels to the smallest parts, with a complete cut list.

Logiciel de bureau pour Windows, en français : on conçoit un meuble en 3D et on obtient la liste exacte des pièces à découper. Il fonctionne entièrement hors ligne, sans compte.

## Ce qu'il permet

- Créer un caisson à partir de ses dimensions, ou dessiner un meuble panneau par panneau.
- Ajuster les pièces en 3D : poignées avec alignement automatique, cotes, matériau, quarts de tour, copier-coller, duplication, annulation.
- Lire la liste de découpe : pièces identiques regroupées, cotes exactes à 0,1 mm, totaux de surface par matériau et épaisseur.
- Enregistrer les projets dans des fichiers `.cotabois`.
- Exporter la liste en PDF pour l'atelier, ou en CSV pour un tableur.

Les pièces sont des panneaux rectangulaires, et le seul modèle de départ est le caisson. D'autres meubles, d'autres formes et le calepinage sont prévus plus tard.

## Installer

Construire l'installeur (voir plus bas), puis double-cliquer sur `dist/CotaBois Setup <version>.exe`. L'installation ne demande ni droits administrateur ni autre logiciel, et crée une icône sur le bureau et dans le menu Démarrer.

## Développer

Il faut [Node.js](https://nodejs.org/) 26 LTS. Sous PowerShell, si les scripts sont bloqués, remplacer `npm` par `npm.cmd`.

```bash
npm ci
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Ouvre la vraie fenêtre ; l'interface se met à jour à chaque modification, sans réinstallation |
| `npm test` | Tests du cœur de calcul, sans fenêtre |
| `npm run typecheck` | Vérification des types |
| `npm run test:e2e` | Scénarios dans la vraie application |
| `npm run pack` | Logiciel empaqueté, lançable depuis `dist/win-unpacked`, sans installation |
| `npm run dist` | Installeur Windows, dans `dist/` |

Les tests du logiciel empaqueté et du démarrage ne s'exécutent qu'après `npm run pack`.

## Organisation

- `src/core` : le cœur métier (cotes, caisson, liste de découpe, fichiers), sans dépendance à l'interface. Toutes les longueurs y sont des entiers en dixièmes de millimètre.
- `src/main`, `src/preload` : le processus principal Electron et son pont avec l'interface.
- `src/renderer` : l'interface React et la vue 3D Three.js.
- `specs/` et `.specify/` : la spécification, le plan, les décisions et la constitution du projet.
