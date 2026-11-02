import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { chooseFile, clickMenu, launchApp } from './helpers'

let dir: string

test.beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cotabois-e2e-'))
})

test.afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true })
}

async function commitField(page: Page, label: string, value: string) {
  await field(page, label).fill(value)
  await field(page, label).press('Enter')
}

async function createCaisson(page: Page) {
  await field(page, "Nombre d'étagères").fill('3')
  await page.getByRole('button', { name: 'Créer le caisson' }).click()
  await expect(page.getByTestId('cut-list').locator('tbody tr')).toHaveCount(3)
}

function suggestedPath(app: ElectronApplication): Promise<string | undefined> {
  return app.evaluate(() => (globalThis as { lastSaveDefaultPath?: string }).lastSaveDefaultPath)
}

async function waitForFile(path: string) {
  await expect.poll(() => (existsSync(path) ? statSync(path).size : 0), { timeout: 20_000 }).toBeGreaterThan(0)
}

test('V5 : le CSV reprend exactement la liste affichée', async () => {
  const { app, page } = await launchApp()
  await commitField(page, 'Nom du projet', 'Meuble: "salon"')
  await createCaisson(page)
  await page.getByTestId('cut-list').locator('tbody tr').nth(2).click()
  await commitField(page, 'Matériau', 'Contreplaqué')

  const path = join(dir, 'liste.csv')
  await chooseFile(app, path)
  await clickMenu(app, 'Exporter en CSV…')
  await waitForFile(path)

  const bytes = readFileSync(path)
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  expect(bytes.toString('utf8').slice(1)).toBe(
    'Quantité;Pièces;Longueur (mm);Largeur (mm);Épaisseur (mm);Matériau\r\n' +
      '2;Côté gauche, Côté droit;1800;395;18;\r\n' +
      '5;Dessous, Dessus, Étagère 1, Étagère 2, Étagère 3;764;395;18;\r\n' +
      '1;Fond;1800;800;5;Contreplaqué\r\n'
  )
  expect(basename((await suggestedPath(app)) ?? '')).toBe('Meuble salon - découpe.csv')

  await app.close()
})

test('V5 : le PDF est un A4 complet, et le logiciel revient à son état', async () => {
  const { app, page } = await launchApp()
  await commitField(page, 'Nom du projet', 'Bibliothèque')
  await createCaisson(page)

  const path = join(dir, 'liste.pdf')
  await chooseFile(app, path)
  await page.getByRole('button', { name: 'Exporter en PDF' }).click()
  await waitForFile(path)

  const pdf = readFileSync(path)
  expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  // A4 portrait en points : 595 × 842
  expect(pdf.toString('latin1')).toMatch(/\/MediaBox\s*\[0 0 59[45](\.\d+)? 84[12](\.\d+)?\]/)
  // Le rapport d'un caisson tient sur une page : une page de plus trahirait l'interface imprimée avec lui.
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g)).toHaveLength(1)
  expect(basename((await suggestedPath(app)) ?? '')).toBe('Bibliothèque - découpe.pdf')

  // Le rapport disparaît, et l'application reste utilisable
  await expect(page.getByTestId('report')).toHaveCount(0)
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')
  await commitField(page, 'Largeur', '900')
  await expect(page.getByTestId('cut-list').locator('tbody tr').nth(1)).toHaveText(/864/)

  await app.close()
})

test('les exports ne changent ni le chemin du projet ni son état', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  const projectPath = join(dir, 'projet.cotabois')
  await chooseFile(app, projectPath)
  await clickMenu(app, 'Enregistrer')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')

  const csvPath = join(dir, 'export.csv')
  await chooseFile(app, csvPath)
  await clickMenu(app, 'Exporter en CSV…')
  await waitForFile(csvPath)
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')

  await commitField(page, 'Largeur', '950')
  await chooseFile(app, null)
  await clickMenu(app, 'Enregistrer')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
  expect(readFileSync(projectPath, 'utf8')).toContain('"width": 9500')
  expect(readFileSync(csvPath, 'utf8')).toContain('764')

  await app.close()
})

test('annuler la boîte de dialogue ne produit rien', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await chooseFile(app, null)
  await page.getByRole('button', { name: 'Exporter en CSV' }).click()
  await page.getByRole('button', { name: 'Exporter en PDF' }).click()
  await expect(page.getByTestId('report')).toHaveCount(0)
  await expect(page.getByTestId('file-error')).toHaveCount(0)
  await app.close()
})

test('un export impossible affiche un message', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await chooseFile(app, join(dir, 'dossier-absent', 'liste.pdf'))
  await page.getByRole('button', { name: 'Exporter en PDF' }).click()
  await expect(page.getByTestId('file-error')).toContainText("n'a pas pu être enregistré")
  await expect(page.getByTestId('report')).toHaveCount(0)
  await app.close()
})

test('sans pièce, les exports sont indisponibles et le logiciel dit pourquoi', async () => {
  const { app, page } = await launchApp()
  await expect(page.getByRole('button', { name: 'Exporter en PDF' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Exporter en CSV' })).toBeDisabled()
  await expect(page.getByText('Ajoutez une pièce pour pouvoir exporter')).toBeVisible()

  const path = join(dir, 'vide.csv')
  await chooseFile(app, path)
  await clickMenu(app, 'Exporter en CSV…')
  await expect(page.getByTestId('file-error')).toContainText('Ajoutez une pièce')
  await page.getByTestId('file-error').getByRole('button', { name: 'Fermer' }).click()
  await clickMenu(app, 'Exporter en PDF…')
  await expect(page.getByTestId('file-error')).toContainText('Ajoutez une pièce')
  expect(existsSync(path)).toBe(false)

  await createCaisson(page)
  await expect(page.getByRole('button', { name: 'Exporter en PDF' })).toBeEnabled()
  await app.close()
})
