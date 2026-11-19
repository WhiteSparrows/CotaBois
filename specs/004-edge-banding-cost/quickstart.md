# Quickstart: Chants et coût du meuble

Validation de [spec.md](spec.md). Les commandes sont celles des versions précédentes : `npm run dev`, `npm test`, `npm run test:e2e`, `npm run pack`, `npm run dist` (`npm.cmd` sous PowerShell si les scripts sont bloqués).

## Scénarios

### C1. Poser des chants (US1)

Créer le caisson de référence (800 × 1800 × 400 mm, 3 étagères). Sélectionner la ligne des 5 pièces identiques et cocher `Bord haut`, puis annuler et rétablir.

**Résultat attendu** : une seule action, une bande sur le bord avant de chaque pièce en 3D, une ligne marquée `1 long`. Annuler retire les cinq chants.

### C2. Cote à couper (US1)

Régler un chant de 2 mm pour ce matériau, puis cocher `Bord gauche` et `Bord droit` sur l'une des étagères.

**Résultat attendu** : les 4 autres pièces se coupent à 764 × 393 (`fini 764 × 395`) ; l'étagère modifiée, sur sa propre ligne, à 760 × 393. Le calepinage place ces cotes. Une épaisseur de chant de 400 mm est refusée.

### C3. Métrage (US2)

Sur le caisson de référence, chanter le bord avant des côtés, du dessus, du dessous et des étagères. Régler une surlongueur de 0, puis de 20 mm.

**Résultat attendu** : 7,42 m, puis 7,56 m.

### C4. Exports (US2, FR-019)

Exporter la liste en PDF et en CSV, et le plan de coupe. Refaire les exports avec un caisson sans chant.

**Résultat attendu** : chants, cotes finies et métrages présents ; sans chant, documents identiques à ceux d'avant.

### C5. Coût (US3)

Sur le meuble de C3, avec une surlongueur de 20 mm et les panneaux par défaut, régler le panneau de 18 mm à 45,90 €, son chant à 0,85 €/m, et le panneau de 5 mm à 12,00 €. Le calepinage donne alors 1 panneau de chaque. Retirer ensuite le prix du panneau de 5 mm.

**Résultat attendu** : 45,90 € de panneaux de 18 mm, 6,43 € de chant (7,56 m), 12,00 € de panneaux de 5 mm, 64,33 € au total. Sans le dernier prix : `Total partiel` de 52,33 €, avec le panneau de 5 mm nommé comme manquant.

### C6. Saisies refusées

Saisir des prix de `-3`, `12,345` et `abc`, et une surlongueur de 150 mm.

**Résultat attendu** : chaque saisie est refusée avec une explication, sans rien modifier.

### C7. Caisson (US4)

Créer un caisson avec `Chants sur les bords avant`, puis sans.

**Résultat attendu** : avec l'option, seuls les bords avant des côtés, du dessus, du dessous et des étagères sont chantés, et le fond n'a aucun chant ; sans, aucun chant.

### C8. Compatibilité et performances (FR-018, SC-004, SC-005)

Ouvrir les fichiers de test en versions 1, 2 et 3, puis le projet de 200 pièces, et poser un chant sur 50 pièces.

**Résultat attendu** : ouverture à l'identique ; mise à jour en moins de 1 s.

### C9. Empaqueté

Rejouer C3 et C5 dans `dist/win-unpacked`, puis avec l'installeur issu de `npm run dist`.
