# Contrat : éditeur de forme et exports

## Accès

Dans le panneau d'une pièce, le bouton **Modifier la forme** remplace la liste de découpe par l'éditeur. Le bouton **Terminer** ramène la liste. La vue 3D reste visible et se met à jour à chaque modification validée.

## Éditeur, une seule pièce

- **Aperçu à plat**, à l'échelle : la longueur horizontale, les noms des bords affichés, les découpes et les coins.
- **Coins** : pour chacun, le type (droit, arrondi, chanfrein) et sa valeur.
- **Découpes** : boutons **Encoche**, **Trou rectangulaire**, **Trou rond**. Pour chacune : les cotes, le bord de référence et sa distance sur chaque direction, le rayon d'angle pour un rectangle, et **Supprimer**.
- **Une nouvelle découpe** se place à un endroit libre et valide. S'il n'y en a aucun, le logiciel l'explique.

| Geste sur l'aperçu | Effet |
|---|---|
| Glisser une découpe | La déplace, au millimètre près, bornée à la plage valide |
| Glisser la poignée d'un coin | Change sa taille, au millimètre près, jusqu'au maximum possible |
| Cliquer une découpe | La sélectionne et met ses champs en évidence |
| Relâcher | Une seule action annulable ; les champs affichent les cotes obtenues |

Les champs suivent la règle de la première version : application à la sortie ou avec Entrée, saisie refusée conservée avec son explication, virgule ou point acceptés.

## Éditeur, plusieurs pièces

Pas d'aperçu : uniquement les coins et l'ajout d'une découpe. Si une pièce refuse, rien n'est appliqué, et le message la nomme.

## Liste de découpe

Une ligne de forme affiche `Plan n` à côté du nom de ses pièces. Rien ne change pour une ligne rectangulaire.

## PDF

Après les totaux, une section **Plans des pièces de forme**, seulement s'il y en a :

1. Titre : `Plan n` et les noms des pièces, quantité, épaisseur, matériau.
2. Dessin à l'échelle, noir sur blanc, avec les cotes d'ensemble, les noms des bords, et un numéro pour chaque coin modifié et chaque découpe.
3. Tableau des numéros, par exemple :

| N° | Élément |
|---|---|
| 1 | Coin haut gauche : arrondi R 40 |
| 2 | Encoche 50 × 30 : à 0 du bord gauche et 0 du bord bas, angles R 5 |
| 3 | Trou rond Ø 60 : centre à 150 du bord gauche et 150 du bord bas |

Un plan n'est jamais coupé entre deux pages. Sans pièce de forme, le document reste identique à la première version.

## CSV

Si au moins une ligne a une forme, une dernière colonne `Plan` contient son numéro, vide pour les lignes rectangulaires. Sinon, le format ne change pas.
