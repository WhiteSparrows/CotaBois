# Contrat : pont entre l'interface et le processus principal

L'interface n'a accès ni à Node ni au disque. Le préchargement expose uniquement `window.cotabois`, décrit ici.

Le processus principal mémorise le chemin choisi par l'utilisateur dans une boîte de dialogue. L'interface ne fournit jamais de chemin, et ne peut donc pas écrire ailleurs que là où l'utilisateur l'a demandé.

## Fichiers

Chaque opération renvoie `{ status: "ok", ... }`, `{ status: "canceled" }` si l'utilisateur ferme la boîte de dialogue, ou `{ status: "error", message }`.

| Méthode | Comportement | Résultat `ok` |
|---|---|---|
| `openProject()` | Dialogue d'ouverture filtré sur `.cotabois`, puis lecture du fichier. Le chemin n'est retenu qu'une fois `projectOpened()` appelé. | `{ text }` |
| `projectOpened()` | Confirme que le contenu lu est valide et devient le projet courant. | Sans contenu |
| `saveProject(text, suggestedName)` | Écrit au chemin courant. S'il n'y en a pas, se comporte comme `saveProjectAs`. | `{ fileName }` |
| `saveProjectAs(text, suggestedName)` | Dialogue d'enregistrement, puis écriture et mémorisation du chemin. | `{ fileName }` |
| `newProject()` | Oublie le chemin courant. | Sans contenu |
| `exportCsv(text, suggestedName)` | Dialogue d'enregistrement, puis écriture. Le chemin courant ne change pas. | `{ fileName }` |
| `exportPdf(suggestedName)` | Dialogue d'enregistrement, puis impression A4 de la vue de rapport en PDF. Le chemin courant ne change pas. | `{ fileName }` |

Le dossier proposé par défaut est `Documents`, hors du dossier d'installation. Les projets survivent donc à une désinstallation (FR-030).

## État et fermeture

| Méthode ou événement | Sens | Rôle |
|---|---|---|
| `setDirty(isDirty)` | Interface → principal | Tient à jour l'indicateur de modifications, consulté à la fermeture. |
| `onCloseRequested(callback)` | Principal → interface | L'utilisateur ferme la fenêtre alors que le projet est modifié. L'interface pose alors la question de FR-024. |
| `confirmClose()` | Interface → principal | L'utilisateur a enregistré ou abandonné : la fenêtre se ferme. |

Sans modification, le processus principal ferme directement la fenêtre. Le titre de la fenêtre (`Nom du projet – CotaBois`, précédé de `*` si le projet est modifié) est porté par le titre de la page, sans passer par ce pont.

## Menu

`onMenuCommand(callback)` reçoit un identifiant lorsque l'utilisateur choisit une entrée du menu ou utilise son raccourci :

| Menu | Entrée (raccourci) | Identifiant |
|---|---|---|
| Fichier | Nouveau (Ctrl+N) | `file:new` |
| Fichier | Ouvrir… (Ctrl+O) | `file:open` |
| Fichier | Enregistrer (Ctrl+S) | `file:save` |
| Fichier | Enregistrer sous… (Ctrl+Maj+S) | `file:save-as` |
| Fichier | Exporter en PDF… | `file:export-pdf` |
| Fichier | Exporter en CSV… | `file:export-csv` |
| Édition | Annuler (Ctrl+Z) | `edit:undo` |
| Édition | Rétablir (Ctrl+Y) | `edit:redo` |
| Édition | Dupliquer (Ctrl+D) | `edit:duplicate` |
| Édition | Supprimer (Suppr) | `edit:delete` |
| Affichage | Recadrer sur le meuble (F) | `view:frame` |

Quitter est géré par le menu standard et passe par le même contrôle de fermeture.

`F` et `Suppr` sont seulement affichés dans le menu : l'interface les gère elle-même et les ignore pendant une saisie dans un champ.

## Règles de sécurité

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `spellcheck: false`.
- La politique de sécurité du contenu n'autorise que les ressources de l'application.
- Toute navigation et toute ouverture de fenêtre sont refusées.
- En version empaquetée, toute requête `http(s)` est bloquée au niveau de la session.
