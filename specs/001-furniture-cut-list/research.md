# Research: Conception de meubles et liste de découpe

Versions relevées le 2026-11-02 sur le registre npm et nodejs.org. Les choix de pile (Electron, TypeScript, Three.js) viennent de la constitution et ne sont pas rediscutés ici.

## R1. Représentation des cotes

- **Decision**: toutes les longueurs sont des entiers exprimés en dixièmes de millimètre (`18,5 mm` → `185`). La conversion en nombre à virgule flottante n'a lieu que pour l'affichage 3D.
- **Rationale**: le principe IV interdit toute erreur d'arrondi visible. Avec des entiers, une suite de modifications ne peut pas dériver (`0.1 + 0.2` n'existe plus), et comparer ou regrouper deux pièces est une simple égalité.
- **Alternatives considered**: nombres à virgule en millimètres (dérive et comparaisons avec tolérance, ce qui fausse le regroupement) ; bibliothèque décimale (dépendance inutile, car la précision de 0,1 mm est fixée par la spec).

## R2. Orientation des pièces

- **Decision**: l'orientation est stockée sous forme de deux axes signés : la direction de la longueur et celle de la largeur (`{ "u": "+y", "v": "+z" }`). L'épaisseur suit le troisième axe. La position est le coin minimal de la boîte englobante de la pièce.
- **Rationale**: les quarts de tour donnent exactement 24 orientations, toutes représentables sans calcul flottant. Les cotes de découpe ne dépendent pas de l'orientation (FR-019). Le signe ne change rien pour un rectangle, mais il deviendra utile pour une pièce non symétrique.
- **Alternatives considered**: angles d'Euler (plusieurs écritures pour une même orientation, flottants) ; simple permutation d'axes (ne suffirait plus avec des formes non symétriques).

## R3. Ouverture vers d'autres formes et d'autres modèles

- **Decision**: une pièce contient `shape: { kind: "rectangle", length, width }`, et seuls quelques calculs du cœur lisent cette forme (encombrement, surface). De même, les paramètres de caisson sont rangés dans `template: { kind: "caisson", ... }`. Le fichier de projet porte un `formatVersion`, et le chargement passe par une chaîne de migrations, vide pour l'instant.
- **Rationale**: c'est le minimum pour respecter le principe III sans construire les formes libres avant l'heure (principe VI). Ajouter une forme revient à ajouter une variante, et les anciens fichiers restent valides.
- **Alternatives considered**: `length` et `width` directement sur la pièce (chaque évolution de forme casserait le format) ; moteur de contours génériques dès maintenant (complexité sans besoin présent).

## R4. Espace de test sans réinstallation

- **Decision**: Node.js s'installe sur Windows, et le développement passe par trois niveaux de vérification :
  1. `npm test` lance les tests du cœur, sans fenêtre, et constitue la boucle la plus rapide.
  2. `npm run dev` ouvre la vraie fenêtre, avec mise à jour automatique de l'interface et redémarrage automatique du processus principal.
  3. `npm run pack` produit le logiciel empaqueté sans installeur, lançable directement depuis un dossier. `npm run dist` produit l'installeur, vérifié seulement pour une version livrée.
- **Rationale**: choix de l'utilisateur. La vraie fenêtre permet de tester les dialogues de fichiers et le PDF, ce qu'un navigateur dans Docker ne permettrait pas.
- **Alternatives considered**: Docker et navigateur (écarté par l'utilisateur).

## R5. Outil de développement et d'empaquetage

- **Decision**: electron-vite 6 pour le développement et la compilation, electron-builder 26 pour l'installeur NSIS.
- **Rationale**: electron-vite gère les trois cibles d'Electron (principal, préchargement, interface) avec un seul fichier de configuration. electron-builder produit directement un installeur par utilisateur, sans droits administrateur, avec les raccourcis du bureau et du menu Démarrer (FR-028).
- **Alternatives considered**: Electron Forge (autre chaîne, sans avantage ici) ; Vite seul avec scripts maison (plus de code à entretenir).

## R6. Interface

- **Decision**: React 19 pour les panneaux (formulaire, propriétés, liste, dialogues). La vue 3D est une classe Three.js indépendante, pilotée par l'interface, sans surcouche React pour la 3D.
- **Rationale**: les panneaux sont assez nombreux pour justifier React. Garder la 3D à part permet de maîtriser le rendu et sépare ce qui se teste différemment.
- **Alternatives considered**: TypeScript sans cadre (formulaires et synchronisation à écrire à la main) ; react-three-fiber (une couche de plus, sans gain pour une scène faite de boîtes).

## R7. Modifications, annulation et état

- **Decision**: le projet est une valeur immuable. Chaque action est une fonction pure du cœur `(projet, paramètres) → résultat`. L'historique conserve les états précédents, jusqu'à 100 (la spec en demande au moins 50). Un projet est « modifié » lorsque son état diffère de celui du dernier enregistrement.
- **Rationale**: annuler et rétablir deviennent triviaux et exacts (scénario US3-5). Les états partagent leurs pièces inchangées, donc la mémoire reste faible. Tout passe par le cœur, conformément au principe V.
- **Alternatives considered**: commandes réversibles (chaque action exige son inverse, source de bugs d'exactitude).

## R8. Rendu 3D et performances

- **Decision**: une seule géométrie de boîte, partagée et mise à l'échelle pour chaque pièce, avec un contour. Le rendu se fait à la demande, seulement lorsque la scène ou la caméra change. La sélection utilise le lancer de rayon de Three.js. Le déplacement utilise `TransformControls` (poignées par axe) et les rotations passent par des boutons par quarts de tour.
- **Rationale**: 200 pièces représentent peu d'objets pour une carte graphique intégrée, et le rendu à la demande évite de solliciter le portable à l'arrêt (SC-004, SC-005). Les poignées lèvent l'ambiguïté d'un déplacement 3D à la souris.
- **Alternatives considered**: instanciation (optimisation inutile à cette échelle) ; glissement libre à la souris (profondeur ambiguë, positions imprécises).

## R9. Alignement et chevauchements

- **Decision**: fonctions pures du cœur, sur les boîtes englobantes. Pendant un déplacement, chaque face de la pièce s'aligne sur la face voisine la plus proche, sous un seuil de 5 mm. Les chevauchements sont calculés par comparaison de toutes les paires, et le contact bord à bord n'en est pas un.
- **Rationale**: en entiers, un alignement donne exactement la cote voulue, sans jeu parasite (scénario US3-3). Une comparaison de toutes les paires sur 200 pièces reste instantanée.
- **Alternatives considered**: structure d'indexation spatiale (inutile à cette échelle).

## R10. Fichier de projet

- **Decision**: fichier JSON UTF-8 d'extension `.cotabois`, validé à l'ouverture par un validateur écrit dans le cœur. L'écriture passe par un fichier temporaire puis un renommage.
- **Rationale**: lisible et déboguable, sans base de données (principe II). Le renommage évite d'abîmer un projet existant en cas de disque plein ou d'erreur (cas limite de la spec). Le validateur reste petit et évite une dépendance (principe VI).
- **Alternatives considered**: SQLite (surdimensionné) ; bibliothèque de validation de schéma (dépendance pour moins de cent lignes de règles).

## R11. Exports

- **Decision**:
  - **PDF** : `webContents.printToPDF` d'Electron, au format A4, sur une vue de rapport dédiée à l'impression, avec une image de la scène 3D.
  - **CSV** : écrit par le cœur, en UTF-8 avec BOM, séparateur `;`, virgule décimale et fins de ligne CRLF, pour s'ouvrir correctement dans Excel en configuration française (FR-027).
- **Rationale**: aucune dépendance supplémentaire, et le rendu PDF réutilise le moteur déjà embarqué. Le CSV étant une fonction pure, il se teste sans fenêtre.
- **Alternatives considered**: bibliothèque PDF (mise en page à la main, poids supplémentaire).

## R12. Sécurité et absence de réseau

- **Decision**: `contextIsolation` et `sandbox` activés, `nodeIntegration` désactivé. Le préchargement n'expose qu'une petite API (voir `contracts/desktop-bridge.md`), et c'est le processus principal qui détient les chemins de fichiers choisis par l'utilisateur. Une politique de sécurité du contenu interdit toute ressource distante. En version empaquetée, toute requête `http(s)` est bloquée au niveau de la session. Le correcteur orthographique est désactivé, car il peut télécharger des dictionnaires. Aucune mise à jour automatique.
- **Rationale**: FR-031 et principe II imposent de pouvoir l'affirmer, pas seulement de l'espérer. Le blocage rend la promesse vérifiable par un test.
- **Alternatives considered**: se contenter de ne pas appeler le réseau (rien ne le garantit dans la durée).

## R13. Tests

- **Decision**:
  - **Cœur** : Vitest, avec des tests écrits avant le code et un jeu de meubles de référence calculés à la main (SC-003).
  - **Limites du cœur** : un test vérifie qu'aucun fichier de `src/core` n'importe Electron, Three.js ou React (principe V).
  - **Bout en bout** : Playwright pilote la vraie application Electron, pour les scénarios d'acceptation principaux et les exports.
  - **Performances et fluidité** (SC-002, SC-004, SC-005) : mesurées sur la machine réelle, à partir d'un projet de test de 200 pièces.
  - **Installeur** (US2) : vérification manuelle sur un Windows vierge, à chaque version livrée.
- **Rationale**: chaque principe de la constitution a ainsi un moyen de contrôle concret, et l'effort porte surtout sur le calcul des cotes.
- **Alternatives considered**: tests de l'interface au niveau des composants (coûteux pour peu de valeur, le comportement étant couvert par les scénarios de bout en bout).

## R14. Versions retenues

| Élément | Version | Note |
|---|---|---|
| Node.js | 26.13.0 (LTS) | Version LTS proposée par winget, pour le développement uniquement |
| Electron | 45.2.1 | Exige Node 22.12 ou plus à l'installation |
| electron-vite | 6.0.0 | Accepte Vite 8 |
| electron-builder | 26.18.0 | |
| Vite | 8.3.5 | Exigé par le plugin React 6 |
| @vitejs/plugin-react | 6.2.1 | |
| React, React DOM | 19.3.1 | |
| Three.js, @types/three | 0.187.0 | |
| TypeScript | 7.0.2 | Utilisé pour vérifier les types |
| Vitest | 5.1.0 | Accepte Node 26 et Vite 8 |
| @playwright/test | 1.64.1 | Pilote Electron, sans navigateur à télécharger |

Les versions sont figées dans `package.json`, avec un fichier de verrouillage.

Les paquets de types sont en `@types/react` et `@types/react-dom` 19.3.0, et `@types/node` 24.19.2.

## R15. Risques à lever dès le premier incrément

La chaîne complète (`test`, `dev`, `pack`, `dist`) a été exécutée le 2026-11-02 sur la machine de développement, sous Windows 11 :

- **electron-builder sous Windows** : levé. `dist` aboutit sans mode développeur ni droits administrateur.
- **Combinaison récente** : levé. Node 26, TypeScript 7 et Vite 8 fonctionnent ensemble, sans changement de version. Vite signale seulement un avertissement sur le chargement de sa configuration en CommonJS, sans effet aujourd'hui.
- **Installeur non signé** : à confirmer sur un Windows vierge (scénario V7). Sur la machine de développement, l'installation silencieuse aboutit sans avertissement. Un installeur téléchargé depuis internet déclencherait un avertissement SmartScreen, et une signature n'est pas prévue pour un usage personnel.
- **Windows 10** : la constitution le prend en charge, mais la machine de développement est sous Windows 11. Cette compatibilité n'est pas vérifiée.

## R16. Décisions prises pendant la construction

- **Politique de sécurité du contenu** : elle est injectée dans `index.html` à la compilation, et non écrite dans le fichier source, car le serveur de développement a besoin de scripts en ligne. La version empaquetée reste donc stricte, et le mode développement reste rapide.
- **Touches seules (`F`, `Suppr`)** : affichées dans le menu, mais gérées par l'interface, et ignorées pendant une saisie. Enregistrées comme raccourcis du menu, elles empêcheraient de taper un « f » ou d'effacer du texte dans un champ.
- **Seuil d'alignement (précise R9)** : 5 mm au minimum, et l'équivalent de 8 pixels quand la vue est éloignée. À l'échelle d'un meuble entier, 5 mm ne représentent que 2 ou 3 pixels, et l'alignement serait presque impossible à atteindre à la souris.
- **Déplacement à la souris** : au millimètre près, sauf quand l'alignement donne une cote exacte. Une cote plus fine se saisit dans le champ de position.
- **Panneau de gauche** : il montre la pièce sélectionnée à la place du formulaire du caisson, qui revient quand plus rien n'est sélectionné.
- **Créer un caisson par-dessus des panneaux** : demande la même confirmation qu'un caisson retouché (FR-016), pour ne jamais perdre un travail manuel sans prévenir.
- **Nom du projet** : un champ dédié en haut du panneau de gauche, annulable comme toute modification. Il propose le nom du fichier à l'enregistrement, mais le fichier peut porter un autre nom : les deux restent indépendants.
- **Écriture des fichiers** : `src/main/atomicWrite.ts` est séparé de `files.ts` pour être testé sans Electron.
- **Rapport PDF** : `printBackground` reste désactivé, sinon la couleur de fond de la fenêtre teinte les marges. Les règles d'impression ont une spécificité renforcée, car `styles.css` peut être chargé après elles : ce défaut a fait imprimer l'interface dans le PDF, sans qu'aucun test ne le voie. Un test compte désormais les pages du rapport d'un caisson.
- **Contrôle des PDF** : les tests vérifient le format et le nombre de pages, mais pas le rendu. Le rendu réel a été contrôlé à l'œil sur un rapport court et un rapport de 3 pages, à reproduire si la mise en page change.
- **Exports sans pièce** : les boutons sont désactivés avec une explication, et les entrées du menu, toujours actives, affichent la même raison.
