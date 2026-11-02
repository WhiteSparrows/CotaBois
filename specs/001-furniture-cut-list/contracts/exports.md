# Contrat : exports de la liste de découpe

Les deux exports reprennent exactement les lignes et les totaux affichés (`computeCutList`). Ils ne sont disponibles que si le projet contient au moins une pièce.

## CSV

- **Encodage** : UTF-8 avec BOM, pour qu'Excel affiche correctement les accents.
- **Format** : séparateur `;`, virgule décimale, fins de ligne CRLF. Un champ contenant `;`, `"` ou un saut de ligne est mis entre guillemets, et ses `"` sont doublés.
- **Protection** : un texte libre qui commence par `=`, `+`, `-` ou `@` est précédé d'une apostrophe, pour qu'un tableur ne l'exécute pas comme une formule.
- **Contenu** : uniquement les lignes de découpe, sans totaux, pour rester exploitable en tableau.

```text
Quantité;Pièces;Longueur (mm);Largeur (mm);Épaisseur (mm);Matériau
2;Côté gauche, Côté droit;1800;395;18;Chêne
5;Dessous, Dessus, Étagère 1, Étagère 2, Étagère 3;764;395;18;Chêne
1;Fond;1800;800;5;Contreplaqué
```

## PDF

- **Format** : A4 portrait, marges de 15 mm, numéro de page en bas de chaque page.
- **Contenu, dans l'ordre** :
  1. nom du projet et date du jour (`2 novembre 2026`) ;
  2. dimensions d'ensemble du meuble ;
  3. image du meuble, en vue isométrique sur fond blanc ;
  4. liste de découpe, avec les mêmes colonnes que le CSV ;
  5. totaux par matériau et épaisseur : nombre de pièces et surface en m².
- **Mise en page** : l'en-tête du tableau se répète sur chaque page et une ligne n'est jamais coupée en deux.

Les chiffres doivent rester lisibles à l'impression en noir et blanc, sans dépendre de la couleur (SC-009).

## Noms de fichiers proposés

`<nom du projet> - découpe.pdf` et `<nom du projet> - découpe.csv`. Les caractères interdits par Windows sont retirés.
