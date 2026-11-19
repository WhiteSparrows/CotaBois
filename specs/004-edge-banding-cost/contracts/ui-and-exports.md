# Contrat : chants, coût et exports

## Panneau de la pièce

Une section **Chants** avec quatre cases : `Bord bas`, `Bord haut`, `Bord gauche`, `Bord droit`, chacune suivie de « long » ou « court » selon la pièce. Avec plusieurs pièces sélectionnées, une case est cochée si toutes ont ce chant ; un clic l'applique à toutes, en une seule action. Un refus s'affiche sous les cases, avec le nom de la pièce en cause.

## Vue 3D

Chaque bord chanté porte une bande colorée sur toute sa longueur, visible quelle que soit l'épaisseur du chant.

## Formulaire du caisson

Une case `Chants sur les bords avant`, décochée par défaut.

## Liste de découpe

| Élément | Affichage |
|---|---|
| Cotes | La cote à couper ; si elle diffère de la cote finie, une mention `fini 764 × 395` |
| Chants | Un repère `2 longs, 1 court` à côté des noms, comme `Plan n` |
| Totaux | Une colonne `Chant`, en mètres, seulement si le meuble a des chants |

## Vue de calepinage

| Emplacement | Ajouts |
|---|---|
| Réglages communs | `Surlongueur de chant`, en mm |
| Chaque matériau et épaisseur | `Prix du panneau` (€), `Épaisseur du chant` (mm), `Prix du chant` (€/m) ; un rappel si des chants sont posés avec une épaisseur nulle |
| Résumé du groupe | `Chant : 7,56 m (7 bords)` |
| En tête | **Coût du meuble** : chaque achat avec sa quantité, son prix et son montant, puis le total ; `Total partiel` et la liste de ce qui manque si un prix manque |

## Exports

| Document | Changement, seulement si le meuble a des chants |
|---|---|
| Liste de découpe en PDF | Cote finie quand elle diffère, chants de chaque ligne, métrage de chaque chant dans les totaux |
| CSV | Colonnes `Chants`, `Longueur finie (mm)`, `Largeur finie (mm)`, `Chant (m)` après les colonnes existantes |
| Plan de coupe en PDF | Ligne de chant dans les achats, avec son métrage ; prix et montants si des prix sont saisis, et le total, marqué partiel s'il le faut |

Sans chant ni prix, ces documents restent ceux d'aujourd'hui (FR-019).
