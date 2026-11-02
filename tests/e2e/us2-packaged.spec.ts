import { _electron as electron, expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { cleanEnv } from './helpers'

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
})
