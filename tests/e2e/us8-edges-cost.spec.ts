import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chooseFile, clickMenu, launchApp } from './helpers'

let dir: string

test.beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cotabois-edges-'))
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

function cutRows(page: Page) {
  return page.getByTestId('cut-list').locator('tbody tr')
}

function edgeBox(page: Page, label: string) {
  return page.getByRole('checkbox', { name: label, exact: true })
}

function group(page: Page, label: string) {
  return page.getByRole('region', { name: `Panneaux ${label}` })
}

async function commitInGroup(page: Page, label: string, fieldLabel: string, value: string) {
  const input = group(page, label).getByLabel(fieldLabel, { exact: true })
  await input.fill(value)
  await input.press('Enter')
}

async function createCaisson(page: Page) {
  await field(page, "Nombre d'étagères").fill('3')
  await page.getByRole('button', { name: 'Créer le caisson' }).click()
  await expect(cutRows(page)).toHaveCount(3)
}

const BOARDS = 'sans matériau, 18 mm'

/** Pose un chant sur le bord avant des côtés, du dessus, du dessous et des étagères. */
async function bandFrontEdges(page: Page) {
  for (const row of [0, 1]) {
    await cutRows(page).nth(row).click()
    await edgeBox(page, 'Bord haut').check()
  }
}

/** Remplace l'impression par une lecture du document affiché : on vérifie ce qui serait imprimé. */
async function capturePrinted(app: ElectronApplication, testId: string): Promise<void> {
  await app.evaluate(({ BrowserWindow }, id) => {
    const contents = BrowserWindow.getAllWindows()[0]!.webContents
    contents.printToPDF = (async () => {
      ;(globalThis as { printedText?: string }).printedText = await contents.executeJavaScript(
        `document.querySelector('[data-testid=${id}]')?.innerText ?? ''`
      )
      return Buffer.from('%PDF-1.4\n')
    }) as typeof contents.printToPDF
  }, testId)
}

async function printedText(app: ElectronApplication): Promise<string> {
  await expect.poll(() => app.evaluate(() => (globalThis as { printedText?: string }).printedText)).toBeTruthy()
  const text = (await app.evaluate(() => (globalThis as { printedText?: string }).printedText))!
  await app.evaluate(() => delete (globalThis as { printedText?: string }).printedText)
  return text
}

test('C1 : poser un chant sur les 5 pièces d\'une ligne, en une seule action', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await cutRows(page).nth(1).click()
  await expect(page.getByText('5 pièces sélectionnées')).toBeVisible()

  await expect(edgeBox(page, 'Bord haut')).not.toBeChecked()
  await edgeBox(page, 'Bord haut').check()
  await expect(edgeBox(page, 'Bord haut')).toBeChecked()
  await expect(cutRows(page).nth(1)).toContainText('1 long')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-edge-band-count', '5')

  // Une seule action : une annulation retire les cinq chants
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(cutRows(page).nth(1)).not.toContainText('long')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-edge-band-count', '0')
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click()
  await expect(cutRows(page).nth(1)).toContainText('1 long')
  await app.close()
})

test('C2 : le chant réduit la cote à couper, dans la liste et le calepinage', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await cutRows(page).nth(1).click()
  await edgeBox(page, 'Bord haut').check()

  await page.getByRole('button', { name: 'Calepinage', exact: true }).click()
  // Épaisseur nulle avec des chants posés : le logiciel le rappelle
  await expect(group(page, BOARDS)).toContainText('épaisseur du chant est nulle')
  await commitInGroup(page, BOARDS, 'Épaisseur du chant', '2')
  await expect(group(page, BOARDS)).not.toContainText('épaisseur du chant est nulle')

  await expect(cutRows(page).nth(1)).toContainText('393')
  await expect(cutRows(page).nth(1)).toContainText('fini 764 × 395')
  await expect(page.getByTestId('layout-view')).toContainText('764 × 393')

  // Une pièce chantée sur ses deux bords courts et un bord long : 760 × 393
  await page.getByRole('button', { name: 'Ajouter un panneau' }).click()
  await commitField(page, 'Nom', 'Étagère seule')
  await commitField(page, 'Longueur', '764')
  await commitField(page, 'Largeur', '395')
  for (const edge of ['Bord haut', 'Bord gauche', 'Bord droit']) await edgeBox(page, edge).check()
  const row = page.getByTestId('cut-list').locator('tbody tr', { hasText: 'Étagère seule' })
  await expect(row).toContainText('760')
  await expect(row).toContainText('1 long, 2 courts')

  // Une épaisseur impossible est refusée, sans rien changer
  await commitInGroup(page, BOARDS, 'Épaisseur du chant', '40')
  await expect(group(page, BOARDS).getByRole('alert')).toContainText('10 mm')
  await expect(row).toContainText('760')
  await app.close()
})

test('C3 : le métrage de chant, avec et sans surlongueur', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await bandFrontEdges(page)
  await page.getByRole('button', { name: 'Calepinage', exact: true }).click()

  const summary = group(page, BOARDS).getByTestId('layout-summary')
  await expect(summary).toContainText('Chant : 7,56 m (7 bords)')
  await commitField(page, 'Surlongueur de chant', '0')
  await expect(summary).toContainText('Chant : 7,42 m (7 bords)')
  await expect(group(page, 'sans matériau, 5 mm').getByTestId('layout-summary')).not.toContainText('Chant')

  // Une surlongueur impossible est refusée
  await commitField(page, 'Surlongueur de chant', '150')
  await expect(page.getByTestId('layout-view').getByRole('alert').first()).toContainText('100 mm')
  await expect(summary).toContainText('7,42 m')
  await app.close()
})

test('C4 : les chants dans la liste, le CSV, la liste imprimée et le plan de coupe', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await bandFrontEdges(page)
  await expect(page.getByTestId('cut-totals')).toContainText('7,56 m')

  const csvPath = join(dir, 'liste.csv')
  await chooseFile(app, csvPath)
  await clickMenu(app, 'Exporter en CSV…')
  await expect.poll(() => existsSync(csvPath)).toBe(true)
  const csv = readFileSync(csvPath, 'utf8')
  expect(csv).toContain(';Chants;Longueur finie (mm);Largeur finie (mm);Chant (m)\r\n')
  expect(csv).toContain('2;Côté gauche, Côté droit;1800;395;18;;1 long;1800;395;3,64\r\n')

  await capturePrinted(app, 'report')
  await chooseFile(app, join(dir, 'liste.pdf'))
  await clickMenu(app, 'Exporter en PDF…')
  const list = await printedText(app)
  expect(list).toContain('1 long')
  expect(list).toContain('7,56 m')

  await capturePrinted(app, 'cutting-plan')
  await chooseFile(app, join(dir, 'plan.pdf'))
  await clickMenu(app, 'Exporter le plan de coupe en PDF…')
  const plan = await printedText(app)
  expect(plan).toContain('Chant à acheter')
  expect(plan).toContain('7,56 m')
  await app.close()
})
