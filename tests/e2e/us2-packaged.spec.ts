import { _electron as electron, expect, test } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chooseFile, cleanEnv, clickMenu } from './helpers'

const EXECUTABLE = join(__dirname, '../../dist/win-unpacked/CotaBois.exe')

test.describe('logiciel empaqueté', () => {
  test.skip(!existsSync(EXECUTABLE), 'Exécuter `npm run pack` avant ce test')

  test('se lance, garde le réseau bloqué et refuse toute navigation', async () => {
    const app = await electron.launch({ executablePath: EXECUTABLE, env: cleanEnv() })
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveTitle(/CotaBois/)
    await expect(page.getByRole('button', { name: 'Créer le caisson' })).toBeVisible()

    // Depuis l'interface : politique de sécurité du contenu
    // On exige la cause du refus : une simple absence de réseau ne doit pas faire passer le test.
    const violatedDirective = await page.evaluate(async () => {
      const violation = new Promise<string>((resolve) => {
        document.addEventListener('securitypolicyviolation', (event) => resolve(event.effectiveDirective))
      })
      await fetch('https://example.com/').catch(() => undefined)
      return violation
    })
    expect(violatedDirective).toBe('connect-src')

    // Depuis le processus principal : blocage au niveau de la session
    const sessionError = await app.evaluate(async ({ net }) => {
      try {
        await net.fetch('https://example.com/')
        return 'ouvert'
      } catch (error) {
        return String(error)
      }
    })
    expect(sessionError).toContain('ERR_BLOCKED_BY_CLIENT')

    // Aucune nouvelle fenêtre, aucune navigation
    const before = page.url()
    await page.evaluate(() => {
      window.open('https://example.com/')
      window.location.href = 'https://example.com/'
    })
    await page.waitForTimeout(500)
    expect(app.windows()).toHaveLength(1)
    expect(page.url()).toBe(before)

    // L'interface n'a pas accès à Node
    expect(await page.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe('undefined')

    await app.close()
  })

  test('donne le même résultat que depuis les sources : découpe, enregistrement et exports', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cotabois-packaged-'))
    const app = await electron.launch({ executablePath: EXECUTABLE, env: cleanEnv() })
    try {
      const page = await app.firstWindow()
      await page.waitForLoadState('domcontentloaded')
      await page.getByLabel("Nombre d'étagères", { exact: true }).fill('3')
      await page.getByRole('button', { name: 'Créer le caisson' }).click()

      const rows = page.getByTestId('cut-list').locator('tbody tr')
      await expect(rows).toHaveCount(3)
      await expect(rows.nth(0)).toHaveText(/^2\s*Côté gauche, Côté droit\s*1800\s*395\s*18/)
      await expect(rows.nth(1)).toHaveText(/^5\s*Dessous, Dessus, Étagère 1, Étagère 2, Étagère 3\s*764\s*395\s*18/)
      await expect(rows.nth(2)).toHaveText(/^1\s*Fond\s*1800\s*800\s*5/)
      await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')

      const projectPath = join(dir, 'projet.cotabois')
      await chooseFile(app, projectPath)
      await clickMenu(app, 'Enregistrer')
      await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
      expect(JSON.parse(readFileSync(projectPath, 'utf8')).pieces).toHaveLength(8)

      const csvPath = join(dir, 'liste.csv')
      await chooseFile(app, csvPath)
      await page.getByRole('button', { name: 'Exporter en CSV' }).click()
      await expect.poll(() => existsSync(csvPath)).toBe(true)
      expect(readFileSync(csvPath, 'utf8')).toContain('1;Fond;1800;800;5;')

      const pdfPath = join(dir, 'liste.pdf')
      await chooseFile(app, pdfPath)
      await page.getByRole('button', { name: 'Exporter en PDF' }).click()
      await expect.poll(() => existsSync(pdfPath), { timeout: 20_000 }).toBe(true)
      const pdf = readFileSync(pdfPath).toString('latin1')
      expect(pdf.startsWith('%PDF-')).toBe(true)
      expect(pdf.match(/\/Type\s*\/Page\b(?!s)/g)).toHaveLength(1)

      // Le dossier proposé par défaut n'est pas celui du logiciel
      const defaultPath = await app.evaluate(() => (globalThis as { lastSaveDefaultPath?: string }).lastSaveDefaultPath)
      expect(defaultPath).toContain('Documents')
      expect(defaultPath).not.toContain('win-unpacked')
    } finally {
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((w) => w.destroy())).catch(() => undefined)
      await app.close().catch(() => undefined)
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
