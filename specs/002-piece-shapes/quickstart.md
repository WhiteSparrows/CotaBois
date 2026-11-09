# Quickstart: Pièces de forme

Validation de [spec.md](spec.md). Les commandes sont celles de la première version : `npm run dev`, `npm test`, `npm run test:e2e`, `npm run pack`, `npm run dist` (`npm.cmd` sous PowerShell si les scripts sont bloqués).

## Scénarios

### F1. Arrondir (US1)

Ajouter un panneau de 800 × 300 × 18 mm. Arrondir `haut gauche` et `haut droit` à 40 mm.

**Résultat attendu** : deux coins arrondis en 3D et sur l'aperçu. La liste indique 800 × 300 × 18 et `Plan 1`. Un rayon de 270 mm sur `bas gauche` est refusé : le côté gauche mesure 300 mm et `haut gauche` en occupe déjà 40, donc le maximum affiché est de 260 mm. Annuler rend exactement la forme précédente.

### F2. Découper (US2)

Sur cette pièce, ajouter une encoche de 50 × 30 mm dans le coin bas gauche, et un trou rond de 60 mm centré à 150 mm des bords gauche et bas. Faire glisser le trou sur l'aperçu.

**Résultat attendu** : on voit à travers le trou en 3D, et un clic à travers sélectionne ce qui est derrière. La position suit au millimètre près dans les champs. Une découpe qui dépasse, en touche une autre ou traverse toute la pièce est refusée.

### F3. Assemblage (US2-6)

Loger une planche de 50 × 30 mm de section dans l'encoche. Déplacer ensuite une autre pièce sur le trou.

**Résultat attendu** : aucun chevauchement pour la planche logée, un signalement pour l'autre.

### F4. Regroupement et plan (US3)

Dupliquer la pièce, retourner la copie, puis exporter en PDF et en CSV. Ajouter une troisième pièce de mêmes cotes, mais avec un seul arrondi.

**Résultat attendu** : deux pièces sur une ligne `Plan 1`, la troisième sur `Plan 2`. Le PDF contient deux plans, chacun avec ses cotes. Le CSV a une colonne `Plan`. Contrôler le PDF à l'œil, puis fabriquer ou simuler la pièce à partir du seul plan imprimé (SC-003).

### F5. Plusieurs pièces (US4)

Cliquer sur la ligne des 5 pièces identiques d'un caisson (ou choisir des pièces avec `Ctrl+clic` dans la vue 3D) et arrondir leur coin `haut gauche` à 20 mm.

**Résultat attendu** : une seule action annulable, et les pièces modifiées restent regroupées sur une même ligne. Si la modification ne convient pas à l'une d'elles, aucune ne change, et le message la nomme.

### F6. Modifier une pièce de forme (FR-012, FR-013)

Faire pivoter la pièce, la copier-coller, puis changer sa longueur.

**Résultat attendu** : la forme suit. Une découpe cotée depuis le bord droit le suit. Une longueur trop courte pour contenir les découpes est refusée.

### F7. Compatibilité (FR-022, FR-023)

Ouvrir `tests/fixtures/projects/valid-v1.cotabois`, un projet enregistré avant cette fonctionnalité.

**Résultat attendu** : ouverture à l'identique. Sans pièce de forme, CSV et PDF restent ceux de la première version.

### F8. Performances (SC-004, SC-005)

Ouvrir le projet de test de 200 pièces, dont 50 de forme.

**Résultat attendu** : modification répercutée en moins d'une seconde, rotation fluide.

### F9. Empaqueté

Rejouer F1, F2 et F4 dans `dist/win-unpacked`, puis avec l'installeur issu de `npm run dist`.
