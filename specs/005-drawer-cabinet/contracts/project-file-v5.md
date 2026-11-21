# Contrat : fichier de projet, version 5

Complète [le contrat de la version 4](../../004-edge-banding-cost/contracts/project-file-v4.md). Seul `template` accepte une nouvelle variante.

```json
{
  "template": {
    "kind": "drawers",
    "params": {
      "width": 6000,
      "height": 7200,
      "depth": 5600,
      "boardThickness": 180,
      "backThickness": 50,
      "drawerCount": 3,
      "frontGap": 30,
      "slideGap": 125,
      "drawerThickness": 150,
      "drawerBottomThickness": 50,
      "frontEdges": false
    },
    "customized": false
  }
}
```

## Règles

| Situation | Comportement |
|---|---|
| Fichier en version 1 à 4 | Lu comme aujourd'hui ; un caisson reste un caisson (FR-015) |
| Modèle `drawers` | Réglages validés selon `data-model.md` ; un réglage invalide refuse le fichier avec `file-corrupted` et le modèle en cause |
| Modèle inconnu | Refus avec `file-corrupted` |
| Version supérieure à 5 | Refus avec `format-too-recent` |
| Enregistrement | Toujours en version 5, champs dans l'ordre ci-dessus |
