import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

/** Un Electron hôte (le terminal d'un autre logiciel) ne doit pas transmettre ce mode à l'application. */
export function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value
  }
  return env
}

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({ args: ['.'], env: cleanEnv() })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')

  // Fin de test : on ne s'arrête pas sur la question posée quand le projet n'est pas enregistré.
  const close = app.close.bind(app)
  app.close = async () => {
    await app
      .evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((window) => window.destroy()))
      .catch(() => undefined)
    await close()
  }
  return { app, page }
}

/** Le chemin que les boîtes de dialogue d'ouverture et d'enregistrement « choisiront » ensuite. */
export async function chooseFile(app: ElectronApplication, path: string | null): Promise<void> {
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = (async () => ({
      canceled: chosen === null,
      filePaths: chosen === null ? [] : [chosen]
    })) as typeof dialog.showOpenDialog
    dialog.showSaveDialog = (async (_window: unknown, options: { defaultPath?: string }) => {
      ;(globalThis as { lastSaveDefaultPath?: string }).lastSaveDefaultPath = options.defaultPath
      return { canceled: chosen === null, filePath: chosen ?? '' }
    }) as unknown as typeof dialog.showSaveDialog
  }, path)
}

export async function clickMenu(app: ElectronApplication, label: string): Promise<void> {
  await app.evaluate(({ Menu }, wanted) => {
    const items = Menu.getApplicationMenu()?.items.flatMap((item) => item.submenu?.items ?? []) ?? []
    items.find((item) => item.label === wanted)?.click()
  }, label)
}
