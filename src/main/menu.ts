import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'

export type MenuCommand =
  | 'file:new'
  | 'file:open'
  | 'file:save'
  | 'file:save-as'
  | 'file:export-pdf'
  | 'file:export-csv'
  | 'edit:undo'
  | 'edit:redo'
  | 'edit:duplicate'
  | 'edit:delete'
  | 'view:frame'

export const MENU_COMMAND_CHANNEL = 'menu:command'

/** Les commandes dont la fonctionnalité existe déjà ; les autres restent grisées. */
const IMPLEMENTED_COMMANDS: ReadonlySet<MenuCommand> = new Set([
  'edit:undo',
  'edit:redo',
  'edit:duplicate',
  'edit:delete',
  'view:frame'
])

interface CommandOptions {
  accelerator?: string
  /** Pour une touche seule : affichée, mais gérée par l'interface afin de ne pas gêner la saisie. */
  displayOnly?: boolean
}

export function installMenu(window: BrowserWindow): void {
  const command = (label: string, id: MenuCommand, options: CommandOptions = {}): MenuItemConstructorOptions => ({
    label,
    enabled: IMPLEMENTED_COMMANDS.has(id),
    registerAccelerator: !options.displayOnly,
    click: () => window.webContents.send(MENU_COMMAND_CHANNEL, id),
    ...(options.accelerator ? { accelerator: options.accelerator } : {})
  })

  const template: MenuItemConstructorOptions[] = [
    {
      label: '&Fichier',
      submenu: [
        command('Nouveau', 'file:new', { accelerator: 'Ctrl+N' }),
        command('Ouvrir…', 'file:open', { accelerator: 'Ctrl+O' }),
        { type: 'separator' },
        command('Enregistrer', 'file:save', { accelerator: 'Ctrl+S' }),
        command('Enregistrer sous…', 'file:save-as', { accelerator: 'Ctrl+Shift+S' }),
        { type: 'separator' },
        command('Exporter en PDF…', 'file:export-pdf'),
        command('Exporter en CSV…', 'file:export-csv'),
        { type: 'separator' },
        { label: 'Quitter', role: 'quit' }
      ]
    },
    {
      label: '&Édition',
      submenu: [
        command('Annuler', 'edit:undo', { accelerator: 'Ctrl+Z' }),
        command('Rétablir', 'edit:redo', { accelerator: 'Ctrl+Y' }),
        { type: 'separator' },
        command('Dupliquer', 'edit:duplicate', { accelerator: 'Ctrl+D' }),
        command('Supprimer', 'edit:delete', { accelerator: 'Delete', displayOnly: true })
      ]
    },
    {
      label: '&Affichage',
      submenu: [
        command('Recadrer sur le meuble', 'view:frame', { accelerator: 'F', displayOnly: true }),
        ...(app.isPackaged
          ? []
          : ([
              { type: 'separator' },
              { label: 'Recharger', role: 'reload' },
              { label: 'Outils de développement', role: 'toggleDevTools' }
            ] satisfies MenuItemConstructorOptions[]))
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
