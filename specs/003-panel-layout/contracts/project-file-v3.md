# Contrat : fichier de projet, version 3

Complète [le contrat de la version 2](../../002-piece-shapes/contracts/project-file-v2.md). Seul le champ `layout` s'ajoute, après `template` et avant `pieces`.

```json
{
  "formatVersion": 3,
  "name": "Bibliothèque",
  "template": null,
  "layout": {
    "kerf": 30,
    "edgeMargin": 0,
    "panels": [
      { "material": "Chêne plaqué", "thickness": 180, "length": 25000, "width": 12500, "grain": true }
    ]
  },
  "pieces": []
}
```

## Règles

| Situation | Comportement |
|---|---|
| Fichier en version 1 ou 2 | Migration vers les réglages par défaut, ouverture à l'identique (FR-020) |
| Fichier en version 3 | Validé selon `data-model.md` : un réglage invalide refuse tout le fichier, avec `file-corrupted` et une explication |
| Couple matériau et épaisseur en double dans `panels` | Fichier refusé, avec `file-corrupted` |
| Version supérieure à 3 | Refus avec `format-too-recent` |
| Enregistrement | Toujours en version 3. Champs dans l'ordre ci-dessus, panneaux triés, pour un fichier stable et lisible |

Le résultat du calepinage n'est jamais écrit dans le fichier. Une version antérieure de CotaBois refuse ces fichiers avec son message « version plus récente ».
