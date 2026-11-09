# Quickstart: Calepinage des panneaux

Validation de [spec.md](spec.md). Les commandes sont celles des versions précédentes : `npm run dev`, `npm test`, `npm run test:e2e`, `npm run pack`, `npm run dist` (`npm.cmd` sous PowerShell si les scripts sont bloqués).

## Scénarios

### L1. Nombre de panneaux (US1)

Créer 4 pièces de 1000 × 500 × 18 mm. Ouvrir le calepinage, régler des panneaux de 2000 × 1000 mm et un trait de scie de 0.

**Résultat attendu** : 1 panneau, utilisation 100 %. Avec un trait de 3 mm : 2 panneaux.

### L2. Plusieurs matériaux et pièce trop grande (US1)

Créer un caisson avec un fond de 5 mm. Ajouter une pièce de 3000 × 500 mm.

**Résultat attendu** : un résultat pour le 18 mm et un pour le 5 mm. La pièce trop grande est nommée, les autres sont placées, et le résultat est indiqué comme incomplet.

### L3. Dessin (US2)

Sur un caisson à 3 étagères, relever les positions et les cotes sur le dessin. Arrondir une pièce.

**Résultat attendu** : toutes les pièces, une seule fois, séparées d'au moins le trait de scie, à l'échelle. La pièce arrondie occupe son rectangle complet et porte `Plan 1`.

### L4. Marge et ajustements exacts

Régler une marge de 10 mm sur des panneaux de 2000 × 1000 mm, avec une pièce de 1980 × 980 mm et un trait de 3 mm. Essayer ensuite une marge de 600 mm.

**Résultat attendu** : la pièce est placée, dans la surface utile. La marge de 600 mm est refusée avec une explication.

### L5. Suivi du meuble et annulation (FR-004, FR-012)

Le calepinage ouvert, changer une étagère de longueur, puis régler le trait de scie et annuler.

**Résultat attendu** : le dessin suit sans autre action. L'annulation rend le réglage précédent. Un caisson généré n'est pas marqué comme retouché par un réglage.

### L6. Plan de coupe (US3)

Exporter le plan de coupe d'un meuble avec plusieurs panneaux. Exporter aussi la liste de découpe.

**Résultat attendu** : un document avec les panneaux à acheter, un dessin coté et un tableau des coupes par panneau, sans bloc coupé entre deux pages. La liste de découpe est identique à celle d'avant. Contrôler le PDF à l'œil, puis découper ou simuler la découpe à partir du seul plan imprimé (SC-004).

### L7. Ordre des coupes et sens du fil (US4, US5)

Suivre les numéros d'un panneau. Puis, avec 4 pièces de 1000 × 500 mm, un trait de 3 mm et des panneaux de 2000 × 1000 mm, activer le sens du fil.

**Résultat attendu** : chaque coupe sépare en deux le morceau en cours, et les pièces obtenues sont celles prévues. Sans le fil : 2 panneaux ; avec : 4, et aucune pièce n'est tournée.

### L8. Compatibilité et performances (FR-020, SC-005, SC-006)

Ouvrir `tests/fixtures/projects/valid-v1.cotabois` et un projet en version 2. Ouvrir le projet de test de 200 pièces, puis le calepinage.

**Résultat attendu** : ouverture à l'identique, avec les réglages par défaut. Le calepinage de 200 pièces s'affiche en moins de 2 secondes.

### L9. Empaqueté

Rejouer L1 et L6 dans `dist/win-unpacked`, puis avec l'installeur issu de `npm run dist`.
