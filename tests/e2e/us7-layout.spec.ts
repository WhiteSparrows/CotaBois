import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { chooseFile, clickMenu, launchApp } from './helpers'

let dir: string

test.beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cotabois-layout-'))
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

function group(page: Page, label: string) {
  return page.getByRole('region', { name: `Panneaux ${label}` })
}

async function commitInGroup(page: Page, label: string, fieldLabel: string, value: string) {
  const input = group(page, label).getByLabel(fieldLabel, { exact: true })
  await input.fill(value)
  await input.press('Enter')
}

async function addPiece(page: Page, name: string, length: string, width: string, material = '') {
  await page.getByRole('button', { name: 'Ajouter un panneau' }).click()
  await commitField(page, 'Nom', name)
  await commitField(page, 'Longueur', length)
  await commitField(page, 'Largeur', width)
  if (material) await commitField(page, 'Matériau', material)
}

async function createCaisson(page: Page) {
  await field(page, "Nombre d'étagères").fill('3')
  await page.getByRole('button', { name: 'Créer le caisson' }).click()
  await expect(page.getByTestId('cut-list').locator('tbody tr')).toHaveCount(3)
}

async function openLayout(page: Page) {
  await page.getByRole('button', { name: 'Calepinage', exact: true }).click()
  await expect(page.getByTestId('layout-view')).toBeVisible()
}

async function waitForFile(path: string) {
  await expect.poll(() => (existsSync(path) ? statSync(path).size : 0), { timeout: 20_000 }).toBeGreaterThan(0)
}

/** Remplace l'impression par une lecture du document affiché : on vérifie ce qui serait imprimé. */
async function captureCuttingPlan(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0]!.webContents
    contents.printToPDF = (async () => {
      ;(globalThis as { printedText?: string }).printedText = await contents.executeJavaScript(
        "document.querySelector('[data-testid=cutting-plan]')?.innerText ?? ''"
      )
      return Buffer.from('%PDF-1.4\n')
    }) as typeof contents.printToPDF
  })
}

function printedText(app: ElectronApplication): Promise<string | undefined> {
  return app.evaluate(() => (globalThis as { printedText?: string }).printedText)
}

test('L1 : le nombre de panneaux suit le trait de scie', async () => {
  const { app, page } = await launchApp()
  await addPiece(page, 'Tablette', '1000', '500', 'Chêne')
  for (let copy = 0; copy < 3; copy++) await page.getByRole('button', { name: 'Dupliquer' }).click()
  await openLayout(page)
  await expect(page.getByRole('button', { name: 'Calepinage', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await commitInGroup(page, '« Chêne », 18 mm', 'Longueur du panneau', '2000')
  await commitInGroup(page, '« Chêne », 18 mm', 'Largeur du panneau', '1000')
  await commitField(page, 'Trait de scie', '0')
  const summary = group(page, '« Chêne », 18 mm').getByTestId('layout-summary')
  await expect(summary).toContainText('1 panneau de 2000 × 1000 mm')
  await expect(summary).toContainText('Utilisation : 100 %')
  await expect(summary).toContainText('4 pièces sur 4')

  await commitField(page, 'Trait de scie', '3')
  await expect(summary).toContainText('2 panneaux de 2000 × 1000 mm')
  await expect(page.getByText('sans garantir que ce soit le minimum')).toBeVisible()

  // Retour à la vue 3D
  await page.getByRole('button', { name: 'Vue 3D' }).click()
  await expect(page.getByTestId('layout-view')).toHaveCount(0)
  await app.close()
})

test('L2 : un résultat par matériau et épaisseur, et une pièce trop grande signalée', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await addPiece(page, 'Plateau', '3000', '500')
  await clickMenu(app, 'Calepinage')
  await expect(page.getByTestId('layout-view')).toBeVisible()

  await expect(group(page, 'sans matériau, 18 mm')).toBeVisible()
  await expect(group(page, 'sans matériau, 5 mm')).toBeVisible()
  await expect(group(page, 'sans matériau, 18 mm').getByTestId('layout-summary')).toContainText('7 pièces sur 8')
  const warning = group(page, 'sans matériau, 18 mm').getByTestId('layout-warning')
  await expect(warning).toContainText('Résultat incomplet')
  await expect(warning).toContainText('Plateau')
  await expect(group(page, 'sans matériau, 5 mm').getByTestId('layout-warning')).toHaveCount(0)

  // Une marge sans surface utile est refusée
  await commitField(page, 'Marge de bord', '1100')
  await expect(page.getByTestId('layout-view').getByRole('alert').first()).toBeVisible()
  await app.close()
})

test('L5 : réglages annulables, enregistrés, et résultat qui suit le meuble', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await openLayout(page)

  await commitField(page, 'Trait de scie', '4')
  const path = join(dir, 'projet.cotabois')
  await chooseFile(app, path)
  await clickMenu(app, 'Enregistrer')
  await expect.poll(() => existsSync(path)).toBe(true)
  const saved = JSON.parse(readFileSync(path, 'utf8'))
  expect(saved.layout.kerf).toBe(40)
  expect(saved.template.customized).toBe(false)

  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(field(page, 'Trait de scie')).toHaveValue('3')

  // Le dessin suit une modification de pièce, sans autre action
  await expect(page.getByTestId('layout-view')).toContainText('1800 × 800')
  await page.getByTestId('cut-list').locator('tbody tr').nth(2).click()
  await commitField(page, 'Longueur', '1000')
  await expect(page.getByTestId('layout-view')).toContainText('1000 × 800')
  await expect(page.getByTestId('layout-view')).not.toContainText('1800 × 800')
  await app.close()
})

test('L3 : chaque pièce est dessinée, et les panneaux identiques regroupés', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await openLayout(page)
  await expect(page.getByTestId('layout-piece')).toHaveCount(8)

  // Une pièce arrondie occupe son rectangle et renvoie à son plan
  await addPiece(page, 'Tablette', '800', '300')
  await page.getByRole('button', { name: 'Modifier la forme' }).click()
  await field(page, 'Type du coin haut gauche').selectOption('round')
  await page.getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByTestId('layout-piece')).toHaveCount(9)
  await expect(page.getByTestId('layout-view')).toContainText('Plan 1')
  await app.close()
})

test('L3 : quatre panneaux au même placement sont présentés une fois, avec leur quantité', async () => {
  const { app, page } = await launchApp()
  await addPiece(page, 'Plateau', '1000', '500')
  for (let copy = 0; copy < 3; copy++) await page.getByRole('button', { name: 'Dupliquer' }).click()
  await openLayout(page)
  await commitInGroup(page, 'sans matériau, 18 mm', 'Longueur du panneau', '1000')
  await commitInGroup(page, 'sans matériau, 18 mm', 'Largeur du panneau', '500')

  await expect(page.getByTestId('layout-panel')).toHaveCount(1)
  await expect(page.getByTestId('layout-panel')).toHaveAttribute('data-quantity', '4')
  await expect(page.getByTestId('layout-panel')).toContainText('× 4')
  await app.close()
})

test('L6 : le plan de coupe est un PDF séparé, au nom du projet', async () => {
  const { app, page } = await launchApp()
  await commitField(page, 'Nom du projet', 'Bibliothèque')
  await createCaisson(page)
  await openLayout(page)

  const path = join(dir, 'plan.pdf')
  await chooseFile(app, path)
  await page.getByRole('button', { name: 'Exporter le plan de coupe' }).click()
  await waitForFile(path)
  const pdf = readFileSync(path).toString('latin1')
  expect(pdf.startsWith('%PDF-')).toBe(true)
  expect(pdf).toMatch(/\/MediaBox\s*\[0 0 59[45](\.\d+)? 84[12](\.\d+)?\]/)
  const suggested = await app.evaluate(() => (globalThis as { lastSaveDefaultPath?: string }).lastSaveDefaultPath)
  expect(basename(suggested ?? '')).toBe('Bibliothèque - plan de coupe.pdf')

  // Le document disparaît, et l'application reste utilisable
  await expect(page.getByTestId('cutting-plan')).toHaveCount(0)
  await expect(page.getByTestId('layout-view')).toBeVisible()
  await app.close()
})

test('L6 : le plan de coupe contient les achats, les réglages, chaque panneau et les avertissements', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await addPiece(page, 'Plateau', '3000', '500')
  await openLayout(page)

  await captureCuttingPlan(app)
  await chooseFile(app, join(dir, 'plan.pdf'))
  await clickMenu(app, 'Exporter le plan de coupe en PDF…')
  await expect.poll(() => printedText(app)).toBeTruthy()
  const text = (await printedText(app))!
  expect(text).toContain('À acheter')
  expect(text).toContain('2800 × 2070')
  expect(text).toContain('Trait de scie : 3 mm')
  expect(text).toContain('Résultat incomplet')
  expect(text).toContain('Plateau')
  expect(text).toContain('Panneau 1 sur 1')
  expect(text).toContain('sans garantir que ce soit le minimum')
  await app.close()
})

test('L6 : sans pièce, le plan de coupe est indisponible et le logiciel dit pourquoi', async () => {
  const { app, page } = await launchApp()
  await openLayout(page)
  await expect(page.getByText('Ajoutez une pièce pour calculer le calepinage.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Exporter le plan de coupe' })).toBeDisabled()

  await chooseFile(app, join(dir, 'vide.pdf'))
  await clickMenu(app, 'Exporter le plan de coupe en PDF…')
  await expect(page.getByTestId('file-error')).toContainText('Ajoutez une pièce')
  expect(existsSync(join(dir, 'vide.pdf'))).toBe(false)
  await app.close()
})
