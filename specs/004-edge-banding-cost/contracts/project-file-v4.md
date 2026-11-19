# Contrat : fichier de projet, version 4

Complète [le contrat de la version 3](../../003-panel-layout/contracts/project-file-v3.md).

```json
{
  "formatVersion": 4,
  "name": "Bibliothèque",
  "template": {
    "kind": "caisson",
    "params": { "width": 8000, "height": 18000, "depth": 4000, "boardThickness": 180, "backThickness": 50, "shelfCount": 3, "frontEdges": true },
    "customized": false
  },
  "layout": {
    "kerf": 30,
    "edgeMargin": 0,
    "edgeOverhang": 200,
    "panels": [
      { "material": "", "thickness": 180, "length": 28000, "width": 20700, "grain": false, "edgeThickness": 20, "panelPrice": 4590, "edgePrice": 85 }
    ]
  },
  "pieces": [
    {
      "id": "p1",
      "name": "Côté gauche",
      "shape": { "kind": "rectangle", "length": 18000, "width": 3950 },
      "edges": ["top"],
      "thickness": 180,
      "material": "",
      "position": { "x": 0, "y": 0, "z": 50 },
      "orientation": { "u": "+y", "v": "+z" }
    }
  ]
}
```

## Règles

| Situation | Comportement |
|---|---|
| Fichier en version 1, 2 ou 3 | Migration : aucun chant, épaisseur de chant nulle, prix absents, surlongueur de 20 mm, option du caisson désactivée. Ouverture à l'identique (FR-018) |
| `edges` | Liste sans doublon de `bottom`, `top`, `left`, `right`, écrite dans cet ordre |
| Prix | Entier de centimes, ou `null` |
| Valeur invalide, ou cote à couper inférieure à 0,1 mm | Fichier refusé avec `file-corrupted` et la pièce ou le réglage en cause |
| Version supérieure à 4 | Refus avec `format-too-recent` |
| Enregistrement | Toujours en version 4, champs dans l'ordre ci-dessus |
