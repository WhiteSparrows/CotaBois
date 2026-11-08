# Contrat : fichier de projet, version 2

Complète `specs/001-furniture-cut-list/contracts/project-file.md`. Seul `shape` accepte une nouvelle variante.

```json
{
  "id": "p1",
  "name": "Tablette",
  "shape": {
    "kind": "shaped",
    "length": 8000,
    "width": 3000,
    "corners": {
      "bottomLeft": { "kind": "straight" },
      "bottomRight": { "kind": "chamfer", "size": 100 },
      "topRight": { "kind": "round", "radius": 400 },
      "topLeft": { "kind": "round", "radius": 400 }
    },
    "cutouts": [
      {
        "id": "c1",
        "kind": "rectangle",
        "sizeU": 500,
        "sizeV": 300,
        "cornerRadius": 50,
        "fromU": { "edge": "left", "distance": 0 },
        "fromV": { "edge": "bottom", "distance": 0 }
      },
      {
        "id": "c2",
        "kind": "circle",
        "diameter": 600,
        "fromU": { "edge": "left", "distance": 1500 },
        "fromV": { "edge": "bottom", "distance": 1500 }
      }
    ]
  },
  "thickness": 180,
  "material": "",
  "position": { "x": 0, "y": 0, "z": 0 },
  "orientation": { "u": "+x", "v": "+z" }
}
```

## Règles

| Situation | Comportement |
|---|---|
| Fichier en version 1 | Migration sans changement de données, ouverture à l'identique (FR-022) |
| Fichier en version 2 | Validé selon `data-model.md` : une forme invalide refuse tout le fichier, avec `file-corrupted` et le nom de la pièce en cause |
| Version supérieure à 2 | Refus avec `format-too-recent` |
| `shaped` sans coin modifié ni découpe | Lu comme un rectangle |
| Enregistrement | Toujours en version 2. Champs dans l'ordre ci-dessus, pour un fichier stable et lisible |

Une version antérieure de CotaBois refuse ces fichiers avec son message « version plus récente ».
