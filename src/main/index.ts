import { app, BrowserWindow, session } from 'electron'
import { join } from 'node:path'
import { installMenu } from './menu'

/** CotaBois fonctionne hors ligne : une fois empaqueté, aucune requête ne peut sortir. */
function blockNetwork(): void {
  if (!app.isPackaged) return
  const urls = ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*']
  session.defaultSession.webRequest.onBeforeRequest({ urls }, (_details, callback) => {
    callback({ cancel: true })
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
