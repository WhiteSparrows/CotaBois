<!--
Sync Impact Report
- Version : 1.1.0 → 1.2.0 (règle élargie, aucun principe retiré)
- Principes modifiés :
  - III. Un seul modèle, fait de panneaux : une pièce peut avoir des coins modifiés et des
    découpes, dans les limites de son rectangle
- Sections modifiées : aucune
- Sections ajoutées : aucune
- Sections supprimées : aucune
- Éléments reportés : aucun
-->

# CotaBois Constitution

## Core Principles

### I. Un vrai logiciel, un clic

CotaBois DOIT se comporter comme un logiciel de bureau ordinaire : il s'installe avec un installeur,
il a sa propre icône, et un double-clic suffit à le lancer.

- L'utilisateur NE DOIT JAMAIS avoir besoin d'un terminal, d'un serveur à démarrer ou d'un outil de
  développement pour utiliser le logiciel.
- Chaque version livrée DOIT être vérifiée à partir de l'installeur, et non depuis l'environnement de
  développement.

**Pourquoi** : c'est la demande de départ. Un outil qu'il faut « lancer » n'est pas celui qui a été
demandé.

### II. Local et hors ligne

Toutes les fonctionnalités DOIVENT marcher sans connexion réseau.

- Le logiciel NE DOIT exiger ni compte, ni service distant, ni télémétrie.
- Les projets DOIVENT rester des fichiers ordinaires, sur l'ordinateur de l'utilisateur, à
  l'emplacement qu'il choisit.

**Pourquoi** : le logiciel est destiné à un usage local, éventuellement à l'atelier, et rien dans son
travail ne nécessite un serveur.

### III. Un seul modèle, fait de panneaux

Un meuble DOIT être décrit par un unique ensemble de pièces. Chaque pièce est un panneau plat défini
par sa longueur, sa largeur, son épaisseur et sa position. Sa forme est ce rectangle, auquel on peut
retirer des coins arrondis ou chanfreinés et des découpes traversantes, définis par des cotes.

- La vue 3D et la liste de découpe DOIVENT être calculées à partir de ce même modèle ; aucune des deux
  ne stocke sa propre copie des dimensions.
- Une modification d'une pièce DOIT se répercuter partout, sans action de synchronisation.
- Ajouter plus tard d'autres modèles de meubles, des contours libres ou des usinages partiels NE DOIT
  PAS imposer de réécrire le modèle ni rendre illisibles les projets existants. Ces évolutions ne sont
  pas construites avant d'avoir leur propre spécification.

**Pourquoi** : si ce que l'on voit et ce que l'on découpe peuvent diverger, le logiciel n'est plus
digne de confiance. Et le modèle doit pouvoir accueillir les évolutions annoncées, sans les payer dès
maintenant.

### IV. Des cotes exactes (NON NÉGOCIABLE)

Une erreur de cote se paie en bois gâché : le calcul des dimensions est la partie la plus critique du
logiciel.

- Les dimensions DOIVENT être enregistrées et calculées sans erreur d'arrondi visible, à 0,1 mm près.
- Toute règle qui produit ou modifie une cote DOIT être couverte par des tests automatisés, écrits
  avant le code, et vérifiés sur des exemples dont le résultat a été calculé à la main.
- Une entrée impossible DOIT être refusée avec une explication : le logiciel NE DOIT JAMAIS produire
  en silence une pièce incohérente.

**Pourquoi** : un bug d'affichage se corrige, une planche coupée trop court, non.

### V. Cœur métier séparé de l'interface

Le modèle du meuble, les règles de génération et le calcul de la liste de découpe DOIVENT vivre dans
un cœur indépendant de l'interface, de la 3D et de l'enveloppe de bureau.

- Ce cœur DOIT pouvoir être testé sans ouvrir de fenêtre.
- L'interface DOIT passer par ce cœur pour tout changement du modèle.

**Pourquoi** : cela rend le principe IV applicable et permet de changer d'enveloppe technique sans
réécrire le métier.

### VI. Simplicité d'abord

Chaque fonctionnalité DOIT répondre à un besoin réel et présent.

- Une complexité supplémentaire (contours libres, usinages partiels, calepinage, plusieurs systèmes d'exploitation…) NE
  DOIT être ajoutée que par une spécification dédiée.
- Une dépendance NE DOIT être ajoutée que si elle évite un travail nettement supérieur à son coût
  d'entretien.

**Pourquoi** : le projet est porté par une seule personne ; ce qui n'est pas construit n'a pas besoin
d'être entretenu.

## Contraintes techniques

- **Plateforme** : Windows 10 et 11, 64 bits. Les autres systèmes sont hors périmètre.
- **Technologies** : Electron, TypeScript et Three.js. Changer l'une d'elles est un amendement à cette
  constitution.
- **Langue** : l'interface est en français.
- **Unité** : le millimètre, partout dans l'interface et les exports.
- **Matériel** : le logiciel DOIT rester fluide sur un portable équipé d'une carte graphique intégrée,
  du niveau d'une Intel Iris Xe.

## Processus de développement

- Toute évolution passe, dans l'ordre, par une spécification, un plan, une liste de tâches, puis le
  code. Le choix des technologies n'apparaît que dans le plan, jamais dans la spécification.
- Le cœur métier suit un cycle rouge-vert : test qui échoue, code, test qui passe.
- L'interface est vérifiée en lançant réellement le logiciel, en plus des tests automatisés.
- Tester une modification NE DOIT PAS exiger de réinstaller le logiciel : pendant le développement,
  il se lance depuis les sources, et l'interface se met à jour à chaque changement. L'installeur n'est
  vérifié que pour les versions livrées, de préférence sur un Windows vierge (principe I).
- Une fonctionnalité est terminée lorsque ses tests passent et que son scénario d'acceptation a été
  rejoué dans le logiciel.

## Governance

Cette constitution prime sur les autres pratiques du projet. Tout plan DOIT vérifier sa conformité aux
principes ci-dessus, et toute entorse DOIT être justifiée par écrit dans ce plan.

Un amendement est validé par le propriétaire du projet, décrit dans le fichier, et accompagné d'un
changement de version :

- **Majeur** : retrait ou redéfinition d'un principe.
- **Mineur** : ajout d'un principe ou d'une section, ou élargissement notable d'une règle.
- **Correctif** : précision ou reformulation sans changement de sens.

**Version**: 1.2.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-08
