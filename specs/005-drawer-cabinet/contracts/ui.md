# Contrat : formulaire de meuble

Le panneau de gauche, quand aucune pièce n'est sélectionnée, devient un formulaire de meuble.

## Choix du modèle

Un sélecteur `Modèle` avec `Caisson` et `Meuble à tiroirs`. À l'ouverture d'un projet, il affiche le modèle du projet ; pour un projet sans modèle, `Caisson`.

## Champs

| Modèle | Champs | Réglages repliés |
|---|---|---|
| Caisson | Ceux d'aujourd'hui, inchangés | — |
| Meuble à tiroirs | `Largeur`, `Hauteur`, `Profondeur`, `Épaisseur du bois`, `Épaisseur du fond`, `Nombre de tiroirs` | **Réglages des tiroirs** : `Jeu entre façades`, `Jeu des coulisses`, `Épaisseur du bois des tiroirs`, `Épaisseur du fond des tiroirs` |

La case `Chants sur les bords avant` est commune aux deux modèles.

## Création et ajustement

| Situation | Comportement |
|---|---|
| Projet sans modèle | Bouton `Créer le caisson` ou `Créer le meuble à tiroirs` ; confirmation s'il y a déjà des pièces |
| Projet du même modèle | Chaque champ s'applique à la sortie ou avec Entrée, comme aujourd'hui ; confirmation si le meuble a été retouché |
| Changement de modèle sur un projet qui a des pièces | Bouton de création, et confirmation : `Créer un meuble à tiroirs remplacera le caisson.` |
| Saisie refusée | Message sous le champ en cause, rien n'est créé |
