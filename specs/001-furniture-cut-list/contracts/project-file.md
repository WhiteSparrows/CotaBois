# Contrat : fichier de projet `.cotabois`

Fichier JSON en UTF-8. Les entités et leurs règles sont définies dans [data-model.md](../data-model.md).

## Structure

```json
{
  "formatVersion": 1,
  "name": "Bibliothèque du salon",
  "template": {
    "kind": "caisson",
    "params": {
      "width": 8000,
      "height": 18000,
      "depth": 4000,
      "boardThickness": 180,
      "backThickness": 50,
      "shelfCount": 3
    },
    "customized": false
  },
  "pieces": [
    {
      "id": "p1",
      "name": "Côté gauche",
      "shape": { "kind": "rectangle", "length": 18000, "width": 3950 },
      "thickness": 180,
      "material": "Chêne",
      "position": { "x": 0, "y": 0, "z": 50 },
      "orientation": { "u": "+y", "v": "+z" }
    }
  ]
}
```

Toutes les longueurs sont en dixièmes de millimètre.

## Règles à l'ouverture

| Situation | Comportement | Code d'erreur |
|---|---|---|
| Fichier illisible ou JSON invalide | Refus, projet en cours inchangé | `file-corrupted` |
| JSON valide sans `formatVersion` entier | Refus : ce n'est pas un projet CotaBois | `not-a-project` |
| `formatVersion` supérieur à la version connue | Refus, sans ouverture partielle : le message invite à mettre à jour | `format-too-recent` |
| `formatVersion` inférieur | Migrations successives jusqu'à la version courante, puis validation | |
| Champ absent, valeur hors limites, `id` en double, `shape.kind` inconnu | Refus, avec le nom de la pièce ou du champ en cause | `file-corrupted` |

Une ouverture réussie n'est jamais partielle : tout le fichier est valide, ou rien n'est chargé.

## Règles à l'enregistrement

- L'écriture passe par un fichier temporaire dans le même dossier, puis un renommage. En cas d'échec, le fichier précédent reste intact.
- Le JSON est indenté de deux espaces et les pièces gardent leur ordre, pour qu'une relecture ou une comparaison reste possible.
- Rouvrir un fichier enregistré redonne un projet strictement égal (SC-006).

## Évolution

Toute modification incompatible augmente `formatVersion` et ajoute une migration depuis la version précédente, accompagnée d'un fichier d'exemple dans les tests. Un fichier en version 1 DOIT toujours pouvoir s'ouvrir, y compris une fois d'autres formes prises en charge.
