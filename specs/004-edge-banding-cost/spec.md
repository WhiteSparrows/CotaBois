# Feature Specification: Chants et coût du meuble

**Feature Branch**: `claude/furniture-3d-modeling-app-ca615b`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "Chants et coût : indiquer quels bords de chaque pièce reçoivent un chant, calculer les mètres de chant nécessaires, et estimer le prix du meuble à partir du prix des panneaux et du chant."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Indiquer les chants d'une pièce (Priority: P1)

L'utilisateur choisit, pour chaque pièce, lesquels de ses quatre bords reçoivent un chant. Il le voit sur la pièce en 3D et dans la liste de découpe.

**Why this priority**: C'est la donnée de départ : sans elle, ni les mètres de chant ni leur coût ne peuvent être calculés, et la liste de découpe ne dit pas quels bords plaquer.

**Independent Test**: Sur une étagère de 764 × 395 mm, poser un chant sur le bord avant, puis vérifier l'affichage en 3D, la liste et l'annulation.

**Acceptance Scenarios**:

1. **Given** une pièce sélectionnée, **When** l'utilisateur coche un bord, **Then** ce bord est marqué dans la vue 3D, et la liste de découpe indique les chants de la pièce.
2. **Given** les 5 pièces identiques d'un caisson sélectionnées, **When** l'utilisateur pose un chant sur un bord long, **Then** toutes le reçoivent en une seule action annulable, et elles restent sur une même ligne de la liste.
3. **Given** deux pièces de mêmes cotes, l'une avec un chant et l'autre sans, **When** l'utilisateur consulte la liste, **Then** elles sont sur deux lignes distinctes.
4. **Given** deux pièces identiques dont l'une est tournée d'un demi-tour, **When** elles ont un chant sur le même bord physique, **Then** elles sont sur la même ligne.
5. **Given** un chant posé, **When** l'utilisateur annule, **Then** la pièce revient exactement à son état précédent.
6. **Given** un chant de 2 mm pour le matériau d'une étagère de 764 × 395 mm, **When** l'utilisateur pose un chant sur son bord bas, **Then** la liste indique la cote à couper 764 × 393 et la cote finie 764 × 395, et le calepinage place une pièce de 764 × 393.
7. **Given** ce même chant sur les bords gauche et droit, **When** l'utilisateur consulte la liste, **Then** la cote à couper est 760 × 395.

---

### User Story 2 - Savoir combien de chant acheter (Priority: P1)

L'utilisateur lit le métrage de chant nécessaire, et l'emporte avec les autres documents d'atelier.

**Why this priority**: C'est la question pratique qui suit le choix des chants, comme le nombre de panneaux suit la liste de découpe.

**Independent Test**: Sur un caisson dont les bords avant sont chantés, comparer le métrage annoncé à un calcul à la main.

**Acceptance Scenarios**:

1. **Given** un caisson de 800 × 1800 × 400 mm à 3 étagères dont les bords avant sont chantés, avec une surlongueur nulle, **When** l'utilisateur consulte le métrage, **Then** il lit 2 × 1,8 + 5 × 0,764 = 7,42 m.
2. **Given** ce même caisson avec une surlongueur de 20 mm par bord, **When** l'utilisateur consulte le métrage, **Then** il lit 7,42 + 7 × 0,02 = 7,56 m.
3. **Given** des chants sur des pièces de matériaux différents, **When** l'utilisateur consulte le métrage, **Then** il est donné séparément pour chaque chant à acheter.
4. **Given** un meuble avec des chants, **When** l'utilisateur exporte la liste de découpe et le plan de coupe, **Then** les deux indiquent les chants de chaque pièce et le métrage total.

---

### User Story 3 - Estimer le prix du meuble (Priority: P2)

L'utilisateur saisit le prix de ses panneaux et de ses chants, et lit le coût du meuble, par matériau et au total.

**Why this priority**: Utile pour décider ou chiffrer un meuble, mais on peut construire sans connaître le prix.

**Independent Test**: Sur un meuble dont le calepinage annonce 2 panneaux, saisir les prix et comparer le coût affiché à un calcul à la main.

**Acceptance Scenarios**:

1. **Given** un calepinage de 2 panneaux à 45,90 € et 7,56 m de chant à 0,85 €/m, **When** l'utilisateur consulte le coût, **Then** il lit 91,80 € de panneaux, 6,43 € de chant et 98,23 € au total.
2. **Given** un matériau sans prix saisi, **When** l'utilisateur consulte le coût, **Then** le total est indiqué comme partiel, et le logiciel nomme ce qui manque.
3. **Given** des prix saisis, **When** l'utilisateur enregistre puis rouvre le projet, **Then** les prix sont conservés à l'identique.
4. **Given** un coût calculé, **When** l'utilisateur exporte le plan de coupe, **Then** le document indique le coût de chaque achat et le total.

---

### User Story 4 - Chants proposés pour un caisson (Priority: P3)

En créant un caisson, l'utilisateur peut demander que les bords avant visibles reçoivent un chant.

**Why this priority**: Fait gagner du temps sur le cas le plus courant, mais les chants peuvent être posés à la main.

**Independent Test**: Créer un caisson avec l'option, et vérifier que seuls les bords avant des côtés, du dessus, du dessous et des étagères sont chantés.

**Acceptance Scenarios**:

1. **Given** l'option cochée, **When** l'utilisateur crée un caisson, **Then** le bord avant de chaque côté, du dessus, du dessous et de chaque étagère reçoit un chant, et le fond n'en reçoit aucun.
2. **Given** l'option décochée, **When** l'utilisateur crée un caisson, **Then** aucune pièce n'a de chant, et le résultat est identique à celui d'aujourd'hui.

---

### Edge Cases

- **Pièce de forme** : ses quatre bords peuvent recevoir un chant, mais pas les découpes intérieures ni les encoches.
- **Changement de longueur ou de largeur** : les chants restent sur les mêmes bords, et le métrage suit.
- **Rotation, duplication, copier-coller** : les chants suivent la pièce, sur les mêmes bords physiques.
- **Pièce carrée** : ses bords n'ont ni long ni court ; le regroupement tient compte du nombre et de la position des bords chantés.
- **Épaisseur de chant qui ne laisse pas de cote à couper** : refusée, en nommant la pièce en cause.
- **Changement d'épaisseur du chant d'un matériau** : les cotes à couper, la liste et le calepinage suivent, sans autre action.
- **Épaisseur de chant nulle avec des chants posés** : les cotes à couper sont les cotes finies, et le logiciel le rappelle à côté du réglage.
- **Prix nul** : accepté, il compte pour 0 €.
- **Prix impossible** (négatif, plus de deux décimales, texte) : refusé avec une explication, sans rien modifier.
- **Matériau renommé** : il perd son prix s'il n'en a pas déjà un sous son nouveau nom, comme pour la taille de panneau.
- **Calepinage incomplet** : le coût des panneaux porte sur les panneaux placés, et l'avertissement existant s'ajoute à celui du coût.
- **Régénération d'un caisson dont des chants ont été retouchés** : même confirmation que pour toute retouche.
- **Projet créé avant cette fonctionnalité** : s'ouvre à l'identique, sans chant ni prix.
- **Projet contenant des chants ou des prix, ouvert par une version plus ancienne du logiciel** : refusé avec le message existant, sans ouverture partielle.

## Requirements *(mandatory)*

### Functional Requirements

**Chants**

- **FR-001**: Chacun des quatre bords d'une pièce DOIT pouvoir recevoir un chant ou non, indépendamment des autres. Les bords sont nommés comme dans l'éditeur de forme : bas et haut le long de la longueur, gauche et droit le long de la largeur.
- **FR-002**: Les utilisateurs DOIVENT pouvoir poser ou retirer un chant sur plusieurs pièces sélectionnées en une seule action annulable.
- **FR-003**: Les bords chantés DOIVENT être visibles dans la vue 3D et dans le panneau de la pièce. La liste de découpe DOIT les indiquer pour chaque ligne, par exemple `2 longs, 1 court`.
- **FR-004**: Deux pièces ne DOIVENT être regroupées sur une même ligne que si leurs chants sont identiques, à une rotation ou un retournement près.
- **FR-005**: Les chants DOIVENT suivre la pièce lors d'une rotation, d'une duplication, d'un copier-coller ou d'un changement de dimension.
- **FR-006**: Chaque matériau et épaisseur de panneau DOIT avoir un seul chant, défini par son épaisseur, de 0 à 10 mm à 0,1 mm près et 0 par défaut, et par son prix au mètre. Tous les bords chantés des pièces de ce groupe le reçoivent. Plusieurs chants pour un même matériau ne sont pas pris en charge.
- **FR-007**: La cote de découpe d'une pièce DOIT être sa cote finie diminuée de l'épaisseur du chant, pour chaque bord chanté qui la borne : un chant sur le bord bas ou haut réduit la largeur, sur le bord gauche ou droit, la longueur. La liste de découpe, ses exports et le calepinage DOIVENT utiliser la cote à couper, et indiquer aussi la cote finie quand elles diffèrent. Une épaisseur qui ne laisse pas une cote à couper d'au moins 0,1 mm DOIT être refusée avec une explication.

**Métrage**

- **FR-008**: Le métrage de chaque chant DOIT être la somme des longueurs des bords chantés, plus une surlongueur par bord réglable de 0 à 100 mm, 20 mm par défaut.
- **FR-009**: Le métrage DOIT être affiché en mètres à deux décimales, arrondi au centimètre supérieur, avec le nombre de bords concernés.
- **FR-010**: La liste de découpe exportée en PDF et en CSV, et le plan de coupe, DOIVENT indiquer les chants de chaque ligne et le métrage de chaque chant. Sans aucun chant, ces documents NE DOIVENT PAS changer.

**Coût**

- **FR-011**: Le coût des panneaux d'un matériau et d'une épaisseur DOIT être le nombre de panneaux du calepinage multiplié par le prix d'un panneau ; celui d'un chant, son métrage multiplié par son prix au mètre. Le coût de la seule matière utilisée, chutes exclues, n'est pas calculé.
- **FR-012**: Les prix DOIVENT être facultatifs, saisis en euros au centime près, de 0 à 100 000 €. Une saisie impossible DOIT être refusée avec une explication.
- **FR-013**: Le logiciel DOIT afficher le coût de chaque achat (panneaux de chaque matériau, chaque chant) et le total du meuble, dans la vue de calepinage et dans le plan de coupe.
- **FR-014**: Un total dont un prix manque DOIT être indiqué comme partiel, en nommant ce qui manque. Le logiciel NE DOIT JAMAIS présenter un total partiel comme complet.
- **FR-015**: Tous les montants DOIVENT être calculés au centime près, sans erreur d'arrondi cumulée : chaque achat est arrondi au centime, puis additionné.

**Caisson**

- **FR-016**: Le formulaire du caisson DOIT proposer une option, décochée par défaut, qui pose un chant sur le bord avant des côtés, du dessus, du dessous et des étagères.

**Enregistrement et compatibilité**

- **FR-017**: Les chants, leurs réglages et les prix DOIVENT être enregistrés avec le projet. Toute modification DOIT être annulable. Poser un chant compte comme une retouche d'un caisson généré ; régler un prix ou la surlongueur, non.
- **FR-018**: Les projets enregistrés avec une version antérieure DOIVENT s'ouvrir à l'identique, sans chant ni prix.
- **FR-019**: Un meuble sans chant DOIT produire la même liste de découpe, le même calepinage et les mêmes exports qu'aujourd'hui.

### Key Entities *(include if feature involves data)*

- **Chants d'une pièce**: Pour chacun des quatre bords, la présence ou non d'un chant.
- **Chant d'un matériau**: Pour un matériau et une épaisseur de panneau, le chant acheté en rouleau : son épaisseur et son prix au mètre. Son métrage est calculé.
- **Cote à couper**: La cote finie d'une pièce moins l'épaisseur des chants qui la bornent. Calculée, jamais saisie.
- **Prix d'un panneau**: Le prix d'achat d'un panneau brut, pour un matériau et une épaisseur, à côté de sa taille dans le calepinage.
- **Coût du meuble**: Calculé, jamais saisi : le coût de chaque achat, le total, et ce qui manque pour qu'il soit complet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur pose les chants des bords avant d'un caisson et lit le métrage en moins de 1 minute, sans documentation.
- **SC-002**: Sur un jeu de meubles de référence calculés à la main, 100 % des métrages sont exacts au centimètre.
- **SC-003**: Sur ce même jeu, 100 % des coûts sont exacts au centime.
- **SC-004**: 100 % des projets enregistrés avant cette fonctionnalité s'ouvrent avec une liste de découpe et des exports identiques.
- **SC-005**: Après la pose d'un chant, la vue 3D, la liste et le coût sont à jour en moins de 1 seconde, sur un meuble de 200 pièces.

## Assumptions

- La monnaie est l'euro. Les prix sont ceux que l'utilisateur saisit ; le logiciel ne connaît aucun tarif.
- La longueur d'un bord est celle du côté du rectangle de la pièce. Les arrondis, chanfreins et encoches ne la réduisent pas, ce qui surestime légèrement le chant d'une pièce de forme.
- Le chant est posé sur toute la longueur du bord, et sa largeur convient à l'épaisseur du panneau ; elle n'est pas gérée.
- L'épaisseur par défaut d'un chant est nulle, pour ne jamais réduire une cote sans que l'utilisateur l'ait demandé ; le logiciel invite à la renseigner.
- La vue 3D, les cotes saisies et les plans de forme restent ceux de la pièce finie, chant compris.
- Le coût ne comprend ni la quincaillerie, ni la main-d'œuvre, ni la colle, ni les taxes autres que celles incluses dans les prix saisis.
- Les autres fonctionnalités, leurs limites et leur précision de 0,1 mm restent inchangées.
