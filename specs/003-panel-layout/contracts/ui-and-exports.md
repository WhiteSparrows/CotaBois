# Contrat : vue de calepinage et plan de coupe

## Accès

Dans la barre d'outils, deux boutons **Vue 3D** et **Calepinage** indiquent la vue active. Le calepinage remplace la vue 3D dans la zone centrale ; les panneaux latéraux restent utilisables, et le résultat suit chaque modification du meuble. La commande est aussi dans le menu **Affichage**.

## Vue

De haut en bas :

1. **Réglages communs** : `Trait de scie` et `Marge de bord`, en mm.
2. **Pour chaque matériau et épaisseur** : un en-tête avec le matériau, ou `—`, et l'épaisseur, puis les champs `Longueur du panneau`, `Largeur du panneau` et la case `Respecter le sens du fil`.
3. **Résumé du groupe** : `3 panneaux de 2800 × 2070 mm`, `Utilisation : 87,3 %`, `24 pièces sur 24`.
4. **Avertissements** : `Résultat incomplet`, avec chaque pièce non placée, ses cotes et la raison.
5. **Panneaux** : un dessin par placement distinct, avec `× 2` si plusieurs panneaux sont identiques.

Une mention permanente indique : `Le logiciel cherche le plus petit nombre de panneaux, sans garantir que ce soit le minimum.` Les champs suivent la règle habituelle : application à la sortie ou avec Entrée, saisie refusée conservée avec son explication.

**Exporter le plan de coupe** est désactivé pour un meuble sans pièce, qui affiche un message à la place des résultats.

## Dessin d'un panneau

| Élément | Représentation |
|---|---|
| Panneau | Contour à l'échelle, longueur à l'horizontale, avec ses cotes d'ensemble |
| Marge de bord | Bande hachurée |
| Pièce | Rectangle plein avec son nom et ses cotes, ou un numéro renvoyant à la légende si la place manque |
| Pièce tournée | Mention `↻` à côté des cotes |
| Pièce de forme | Mention `Plan n` ; elle occupe son rectangle complet |
| Chute | Rectangle hachuré, avec ses cotes si la place le permet |
| Coupe | Numéro d'ordre placé sur sa ligne, sans recouvrir un autre numéro |
| Trait de scie | Non dessiné, sauf par l'écart réel entre les pièces |

Les cotes affichées sont celles de la pièce finie. Le texte a une taille constante en millimètres de papier, quelle que soit l'échelle.

## PDF : plan de coupe

Un document séparé, en A4, nommé par défaut `<projet> - plan de coupe.pdf` :

1. **En-tête** : nom du projet et date.
2. **À acheter** : un tableau avec le matériau, l'épaisseur, la quantité, la taille du panneau et l'utilisation.
3. **Réglages** : trait de scie, marge de bord, sens du fil.
4. **Avertissements**, en évidence, si le résultat est incomplet.
5. **Un bloc par panneau** : titre `Panneau 2 sur 3`, ou `Panneaux 2 et 3 (× 2)`, dessin, légende si nécessaire, et tableau des coupes.

| N° | Coupe | Distance au bord du morceau | Longueur |
|---|---|---|---|
| 1 | En long | 395 mm | 2800 mm |
| 2 | En travers | 1800 mm | 395 mm |

Un bloc n'est jamais coupé entre deux pages. La mention sur l'absence de garantie du minimum figure dans le document. L'export existant en PDF et en CSV de la liste de découpe ne change pas.
