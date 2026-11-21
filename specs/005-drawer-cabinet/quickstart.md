# Quickstart: Meuble à tiroirs

Validation de [spec.md](spec.md). Les commandes sont celles des versions précédentes : `npm run dev`, `npm test`, `npm run test:e2e`, `npm run pack`, `npm run dist` (`npm.cmd` sous PowerShell si les scripts sont bloqués).

## Scénarios

### T1. Le meuble de référence (US1)

Choisir `Meuble à tiroirs`, garder les valeurs par défaut (600 × 720 × 560 mm, bois de 18, fond de 5, 3 tiroirs) et créer.

**Résultat attendu** : la liste de la spec, US1, scénario 1 ; 23 pièces en 3D, tiroirs fermés, aucun chevauchement signalé.

### T2. Arrondis (US1)

Passer la hauteur à 721 mm.

**Résultat attendu** : deux façades de 237,3 mm et celle du bas de 237,4 mm ; les trois boîtes ont la même hauteur, 237,3 − 40 = 197,3 mm.

### T3. Refus (US1)

Essayer 10 tiroirs sur 720 mm de haut, une profondeur de 250 mm, puis une largeur de 80 mm.

**Résultat attendu** : chaque saisie est refusée avec une explication ; la première donne le nombre maximal de tiroirs (7), la deuxième la profondeur minimale (265 mm). Rien ne change.

### T4. Ajustement (US2)

Passer de 3 à 4 tiroirs, puis annuler. Retoucher une façade, puis changer la largeur.

**Résultat attendu** : 4 façades et 4 boîtes, en une action annulable ; après la retouche, le logiciel demande confirmation avant de remplacer les pièces.

### T5. Choix du modèle (US3)

Créer un caisson, puis passer à `Meuble à tiroirs`, créer, enregistrer et rouvrir.

**Résultat attendu** : confirmation avant de remplacer le caisson ; le caisson créé est identique à celui d'avant cette fonctionnalité ; le projet rouvert retrouve le modèle et ses réglages.

### T6. Chants et calepinage (US4)

Créer le meuble de référence avec `Chants sur les bords avant`, puis ouvrir le calepinage.

**Résultat attendu** : chants sur les bords avant de la carcasse et sur les 4 bords des façades ; trois groupes de calepinage : 18, 15 et 5 mm.

### T7. Compatibilité (FR-015)

Ouvrir les fichiers de test en versions 1 à 4.

**Résultat attendu** : ouverture à l'identique ; le formulaire affiche `Caisson` pour ceux qui en ont un.

### T8. Empaqueté

Rejouer T1 dans `dist/win-unpacked`, puis avec l'installeur issu de `npm run dist`.
