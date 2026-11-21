# Feature Specification: Meuble à tiroirs

**Feature Branch**: `claude/furniture-3d-modeling-app-ca615b`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "D'autres meubles que le caisson : proposer d'autres modèles de départ, générés à partir de leurs dimensions comme le caisson, en commençant par un seul modèle, celui que l'utilisateur veut construire."

## User Scenarios & Testing *(mandatory)*

Le premier nouveau modèle est le meuble à tiroirs : un caisson fermé par des façades en applique, avec une boîte sur coulisses derrière chacune.

### User Story 1 - Créer un meuble à tiroirs à partir de ses dimensions (Priority: P1)

L'utilisateur choisit le modèle « Meuble à tiroirs », saisit la largeur, la hauteur, la profondeur et le nombre de tiroirs, et obtient d'un coup le caisson, les façades et chaque boîte de tiroir, en 3D et dans la liste de découpe.

**Why this priority**: Les cotes d'un tiroir sont celles qui se calculent le plus mal à la main : jeu des coulisses, façades, profondeur limitée par les coulisses. C'est là que le logiciel fait gagner le plus de temps et évite le plus d'erreurs.

**Independent Test**: Créer un meuble de 600 × 720 × 560 mm à 3 tiroirs, puis comparer la liste de découpe à un calcul à la main.

**Acceptance Scenarios**:

1. **Given** le modèle « Meuble à tiroirs » avec ses réglages par défaut, **When** l'utilisateur crée un meuble de 600 × 720 × 560 mm, bois de 18 mm, fond de 5 mm, 3 tiroirs, **Then** la liste contient exactement :
   - 2 côtés de 720 × 555 × 18 ;
   - un dessus et un dessous de 564 × 555 × 18 ;
   - un fond de 720 × 600 × 5 ;
   - 3 façades de 597 × 237 × 18 ;
   - 6 côtés de tiroir de 500 × 197 × 15 ;
   - 6 avants et arrières de tiroir de 509 × 197 × 15 ;
   - 3 fonds de tiroir de 539 × 500 × 5.
2. **Given** ce meuble, **When** l'utilisateur l'observe en 3D, **Then** les façades ferment l'avant, les tiroirs sont à l'intérieur, fermés, et aucun chevauchement n'est signalé.
3. **Given** un nombre de tiroirs ou des dimensions impossibles, **When** l'utilisateur valide, **Then** le logiciel refuse, explique pourquoi et ne crée rien.

---

### User Story 2 - Ajuster le meuble après coup (Priority: P1)

L'utilisateur change une dimension ou le nombre de tiroirs, et le meuble est recalculé, comme un caisson aujourd'hui.

**Why this priority**: On ne trouve pas les bonnes dimensions du premier coup ; sans cela, il faudrait tout recréer.

**Independent Test**: Passer de 3 à 4 tiroirs, puis de 600 à 800 mm de large, et vérifier la liste après chaque changement.

**Acceptance Scenarios**:

1. **Given** un meuble à 3 tiroirs, **When** l'utilisateur passe à 4 tiroirs, **Then** les façades et les boîtes sont recalculées pour 4, en une seule action annulable.
2. **Given** un meuble dont une pièce a été retouchée à la main, **When** l'utilisateur change une dimension, **Then** le logiciel demande confirmation avant de remplacer les pièces, comme pour un caisson.

---

### User Story 3 - Choisir le modèle de départ (Priority: P2)

Au moment de créer un meuble, l'utilisateur choisit entre le caisson et le nouveau modèle. Chaque modèle a ses propres champs.

**Why this priority**: Indispensable pour accéder au nouveau modèle, mais simple ; le caisson doit rester exactement ce qu'il est.

**Independent Test**: Créer un caisson, puis un meuble à tiroirs, et vérifier que le caisson est identique à celui d'aujourd'hui.

**Acceptance Scenarios**:

1. **Given** un projet vide, **When** l'utilisateur choisit un modèle, **Then** le formulaire n'affiche que les champs de ce modèle, avec leurs valeurs par défaut.
2. **Given** le choix « Caisson », **When** l'utilisateur crée le meuble, **Then** le résultat est identique à celui d'aujourd'hui.
3. **Given** un meuble créé, **When** l'utilisateur rouvre le projet enregistré, **Then** le modèle et ses réglages sont retrouvés à l'identique.

---

### User Story 4 - Chants et calepinage du meuble à tiroirs (Priority: P3)

Les fonctionnalités existantes s'appliquent au nouveau modèle : chants proposés à la création, calepinage, coût.

**Why this priority**: Elles fonctionnent déjà sur toute pièce ; il s'agit surtout de proposer les bons chants par défaut.

**Independent Test**: Créer un meuble à tiroirs avec l'option des chants, puis lire le métrage et le calepinage.

**Acceptance Scenarios**:

1. **Given** l'option des chants cochée, **When** l'utilisateur crée le meuble, **Then** les bords avant des côtés, du dessus et du dessous, ainsi que les 4 bords de chaque façade, reçoivent un chant.
2. **Given** un meuble à tiroirs, **When** l'utilisateur ouvre le calepinage, **Then** le bois de 18 mm, celui de 15 mm et celui de 5 mm forment trois groupes, chacun avec ses panneaux.

---

### Edge Cases

- **Tiroirs trop bas** : une boîte de moins de 50 mm de haut est refusée, avec le nombre maximal de tiroirs possible.
- **Meuble trop peu profond** : une boîte de tiroir de moins de 250 mm de profondeur, longueur minimale des coulisses, est refusée.
- **Meuble trop étroit** : une boîte dont l'avant et l'arrière n'auraient plus de longueur est refusée.
- **Hauteur non divisible** : les façades ont la même hauteur au dixième de millimètre près ; le reste éventuel va à la façade du bas.
- **Profondeur intermédiaire** : la profondeur des boîtes est arrondie aux 50 mm inférieurs, comme les longueurs de coulisses du commerce.
- **Retouche d'une pièce, puis régénération** : même confirmation que pour un caisson retouché.
- **Projet créé avant cette fonctionnalité** : s'ouvre à l'identique ; son caisson reste un caisson.
- **Projet contenant un meuble à tiroirs, ouvert par une version plus ancienne du logiciel** : refusé avec le message existant, sans ouverture partielle.

## Requirements *(mandatory)*

### Functional Requirements

**Choix du modèle**

- **FR-001**: Le logiciel DOIT proposer, à la création d'un meuble, le caisson et le meuble à tiroirs. La bibliothèque à plusieurs colonnes et la table pourront faire l'objet de spécifications ultérieures.
- **FR-002**: Chaque modèle DOIT avoir ses propres champs et valeurs par défaut. Le caisson DOIT rester identique à aujourd'hui.
- **FR-003**: Un projet DOIT contenir un seul meuble généré, comme aujourd'hui : créer un autre meuble remplace le précédent, avec la même confirmation si des pièces ont été dessinées ou retouchées. Plusieurs meubles générés dans un même projet ne sont pas pris en charge.

**Meuble à tiroirs**

- **FR-004**: Le meuble DOIT se définir par sa largeur, sa hauteur, sa profondeur, l'épaisseur du bois, l'épaisseur du fond et le nombre de tiroirs, de 1 à 10. Des réglages avancés DOIVENT donner le jeu entre façades (3 mm par défaut), le jeu des coulisses de chaque côté (12,5 mm), l'épaisseur du bois des tiroirs (15 mm) et celle de leur fond (5 mm).
- **FR-005**: Le caisson DOIT se composer de 2 côtés, d'un dessus, d'un dessous et d'un fond, calculés comme ceux du caisson actuel, sans étagère.
- **FR-006**: Les façades DOIVENT être en applique, posées devant le caisson : largeur égale à celle du meuble moins le jeu entre façades, hauteur égale à la hauteur du meuble moins un jeu par façade, divisée par le nombre de tiroirs. Les façades encastrées ne sont pas prises en charge.
- **FR-007**: Chaque boîte de tiroir DOIT se composer de 2 côtés, d'un avant et d'un arrière posés entre les côtés, et d'un fond posé sous la boîte. Sa largeur est la largeur intérieure du caisson moins le jeu des coulisses de chaque côté ; sa hauteur est celle de la façade moins 40 mm ; sa profondeur est la profondeur intérieure moins 10 mm, arrondie aux 50 mm inférieurs.
- **FR-008**: Les pièces DOIVENT porter des noms clairs, par exemple `Façade 2` ou `Tiroir 2 côté gauche`, et être placées en 3D, tiroirs fermés, sans chevauchement.
- **FR-009**: Une saisie impossible DOIT être refusée avec une explication et, quand c'est possible, la valeur maximale ou minimale admise.

**Comportements communs**

- **FR-010**: Changer un réglage DOIT recalculer le meuble en une seule action annulable, avec la même confirmation que le caisson si des pièces ont été retouchées.
- **FR-011**: L'option « Chants sur les bords avant » DOIT exister pour le nouveau modèle : bords avant du caisson et les 4 bords de chaque façade.
- **FR-012**: Toutes les fonctionnalités existantes DOIVENT s'appliquer aux pièces générées : édition, formes, chants, liste, calepinage, coût et exports.
- **FR-013**: Toutes les cotes générées DOIVENT être exactes à 0,1 mm.

**Enregistrement et compatibilité**

- **FR-014**: Le modèle et ses réglages DOIVENT être enregistrés avec le projet.
- **FR-015**: Les projets enregistrés avec une version antérieure DOIVENT s'ouvrir à l'identique.

### Key Entities *(include if feature involves data)*

- **Modèle de meuble**: Ce que l'utilisateur choisit à la création : le caisson, ou le nouveau modèle. Chaque modèle a ses réglages et sa règle de génération.
- **Réglages du meuble à tiroirs**: Les dimensions, le nombre de tiroirs, et les réglages avancés des façades et des tiroirs.
- **Boîte de tiroir**: Deux côtés, un avant, un arrière et un fond, calculés à partir du caisson et des réglages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur crée un meuble à 3 tiroirs et lit sa liste de découpe en moins de 2 minutes, sans documentation.
- **SC-002**: Sur un jeu de meubles de référence calculés à la main, 100 % des cotes générées sont exactes à 0,1 mm.
- **SC-003**: 100 % des saisies impossibles du jeu d'essai sont refusées avec une explication, sans rien créer.
- **SC-004**: 100 % des projets enregistrés avant cette fonctionnalité s'ouvrent avec une liste de découpe identique.
- **SC-005**: Une personne fabrique les tiroirs à partir de la seule liste de découpe, et ils coulissent avec les coulisses prévues.

## Assumptions

- Les tiroirs ont tous la même hauteur ; des hauteurs différentes par tiroir pourront faire l'objet d'une évolution.
- Les coulisses sont des coulisses latérales à billes ; leur jeu se règle. Les coulisses sous le tiroir et les poignées ne sont pas gérées.
- Le fond du tiroir est vissé ou cloué sous la boîte ; les rainures et les assemblages ne sont pas gérés, comme pour le reste du logiciel.
- Le meuble n'a ni plinthe, ni pieds, ni plan de travail ; on peut les ajouter comme des pièces libres.
- Les tiroirs sont dans le même matériau que le caisson, avec leur propre épaisseur ; le matériau se change ensuite pièce par pièce.
- Les autres fonctionnalités, leurs limites et leur précision de 0,1 mm restent inchangées.
