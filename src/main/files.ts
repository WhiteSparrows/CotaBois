import { app, dialog, ipcMain, type BrowserWindow } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { writeFileAtomic } from './atomicWrite'

export type FileResult<T = unknown> =
  | ({ status: 'ok' } & T)
  | { status: 'canceled' }
  | { status: 'error'; message: string }

const EXTENSION = 'cotabois'
const FILTERS = [{ name: 'Projet CotaBois', extensions: [EXTENSION] }]
const MAX_PROJECT_BYTES = 50 * 1024 * 1024

function saveErrorMessage(error: unknown): string {
  const code = (error as NodeJS.ErrnoException).code
  const prefix = "Le projet n'a pas pu être enregistré."
  if (code === 'ENOSPC') return `${prefix} Le disque est plein.`
  if (code === 'EACCES' || code === 'EPERM') return `${prefix} Ce dossier est protégé ou le fichier est utilisé.`
  return `${prefix} Vérifiez l'emplacement choisi.`
}

export function registerFileHandlers(window: BrowserWindow): void {
  // L'interface ne fournit jamais de chemin : elle ne peut écrire que là où l'utilisateur l'a choisi.
  let currentPath: string | null = null
  let openedPath: string | null = null

  function defaultPath(suggestedName: string): string {
    return join(app.getPath('documents'), `${suggestedName}.${EXTENSION}`)
  }

  async function write(path: string, text: string): Promise<FileResult<{ fileName: string }>> {
    try {
      await writeFileAtomic(path, text)
      currentPath = path
      return { status: 'ok', fileName: basename(path) }
    } catch (error) {
      return { status: 'error', message: saveErrorMessage(error) }
    }
  }

  async function saveAs(text: string, suggestedName: string): Promise<FileResult<{ fileName: string }>> {
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Enregistrer le projet',
      defaultPath: defaultPath(suggestedName),
      filters: FILTERS
    })
    if (canceled || !filePath) return { status: 'canceled' }
    return write(filePath, text)
  }

  ipcMain.handle('file:open', async (): Promise<FileResult<{ text: string }>> => {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Ouvrir un projet',
      defaultPath: app.getPath('documents'),
      filters: FILTERS,
      properties: ['openFile']
    })
    const path = filePaths[0]
    if (canceled || !path) return { status: 'canceled' }

    try {
      if ((await stat(path)).size > MAX_PROJECT_BYTES) {
        return { status: 'error', message: "Ce fichier est trop volumineux pour être un projet CotaBois." }
      }
      const text = await readFile(path, 'utf8')
      openedPath = path
      return { status: 'ok', text }
    } catch {
      return { status: 'error', message: "Ce fichier n'a pas pu être ouvert." }
    }
  })

  // Le chemin ne change qu'une fois le contenu reconnu valide : un fichier refusé ne remplace rien.
  ipcMain.handle('file:opened', () => {
    currentPath = openedPath
  })

  ipcMain.handle('file:save', (_event, text: string, suggestedName: string) =>
    currentPath ? write(currentPath, text) : saveAs(text, suggestedName)
  )

  ipcMain.handle('file:save-as', (_event, text: string, suggestedName: string) => saveAs(text, suggestedName))

  ipcMain.handle('file:new', () => {
    currentPath = null
  })
}
