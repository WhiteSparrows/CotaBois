import { app, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'node:path'
import { registerFileHandlers } from './files'
import { installMenu } from './menu'
import { registerPdfHandler } from './pdf'

/** CotaBois fonctionne hors ligne : une fois empaqueté, aucune requête ne peut sortir. */
function blockNetwork(): void {
  if (!app.isPackaged) return
  const urls = ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*']
  session.defaultSession.webRequest.onBeforeRequest({ urls }, (_details, callback) => {
    callback({ cancel: true })
  })
}

/** Un projet modifié ne se ferme qu'après la réponse de l'utilisateur, posée par l'interface. */
function guardClose(window: BrowserWindow): void {
  let dirty = false
  let closeConfirmed = false

  ipcMain.on('window:set-dirty', (_event, isDirty: boolean) => {
    dirty = isDirty
  })
  ipcMain.on('window:confirm-close', () => {
    closeConfirmed = true
    window.close()
  })
  window.on('close', (event) => {
    if (dirty && !closeConfirmed) {
      event.preventDefault()
      window.webContents.send('window:close-requested')
    }
  })
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    title: 'CotaBois',
    show: false,
    backgroundColor: '#f4f2ec',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  window.once('ready-to-show', () => window.show())
  installMenu(window)
  // Couper, Copier et Coller du menu, quand un champ a le focus.
  ipcMain.on('window:edit-text', (_event, action: unknown) => {
    if (action === 'cut') window.webContents.cut()
    if (action === 'copy') window.webContents.copy()
    if (action === 'paste') window.webContents.paste()
  })
  registerFileHandlers(window)
  registerPdfHandler(window)
  guardClose(window)

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    if (!devServerUrl || !url.startsWith(devServerUrl)) event.preventDefault()
  })

  if (devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

void app.whenReady().then(() => {
  blockNetwork()
  createWindow()
})

app.on('window-all-closed', () => app.quit())
