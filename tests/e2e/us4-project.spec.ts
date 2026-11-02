import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chooseFile, clickMenu, launchApp } from './helpers'

const FIXTURES = join(__dirname, '../fixtures/projects')

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

test('V4 : enregistrer, fermer et rouvrir donne un meuble identique', async () => {
  const path = join(dir, 'meuble.cotabois')

  const first = await launchApp()
  await commitField(first.page, 'Nom du projet', 'Bibliothèque')
  await createCaisson(first.page)
  await first.page.getByTestId('cut-list').locator('tbody tr').nth(2).click()
  await commitField(first.page, 'Matériau', 'Contreplaqué')
  await expect(first.page).toHaveTitle('* Bibliothèque – CotaBois')

  await chooseFile(first.app, path)
  await clickMenu(first.app, 'Enregistrer')
  await expect(first.page).toHaveTitle('Bibliothèque – CotaBois')
  const savedList = await first.page.getByTestId('cut-list').innerText()
  await first.app.close()

  expect(JSON.parse(readFileSync(path, 'utf8')).formatVersion).toBe(1)

  const second = await launchApp()
  await chooseFile(second.app, path)
  await clickMenu(second.app, 'Ouvrir…')
  await expect(second.page).toHaveTitle('Bibliothèque – CotaBois')
  await expect(second.page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')
  expect(await second.page.getByTestId('cut-list').innerText()).toBe(savedList)
  await expect(field(second.page, 'Hauteur')).toHaveValue('1800')
  await expect(second.page.getByText('ajusté à la main')).toBeVisible()

  // Annuler ne remonte pas avant l'ouverture du fichier
  await expect(second.page.getByRole('button', { name: 'Annuler', exact: true })).toBeDisabled()
  await second.app.close()
})

test("l'indicateur de modification suit les enregistrements et l'annulation", async () => {
  const { app, page } = await launchApp()
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')

  await createCaisson(page)
  await expect(page).toHaveTitle('* Nouveau meuble – CotaBois')

  await chooseFile(app, join(dir, 'a.cotabois'))
  await clickMenu(app, 'Enregistrer')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')

  // Revenir à l'état enregistré enlève l'indicateur
  await commitField(page, 'Largeur', '900')
  await expect(page).toHaveTitle('* Nouveau meuble – CotaBois')
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')

  // Enregistrer de nouveau écrit au même endroit, sans redemander
  await commitField(page, 'Largeur', '950')
  await chooseFile(app, join(dir, 'ne-doit-pas-servir.cotabois'))
  await clickMenu(app, 'Enregistrer')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
  expect(readFileSync(join(dir, 'a.cotabois'), 'utf8')).toContain('"width": 9500')

  // Enregistrer sous change d'emplacement
  await chooseFile(app, join(dir, 'b.cotabois'))
  await clickMenu(app, 'Enregistrer sous…')
  const copy = join(dir, 'b.cotabois')
  await expect.poll(() => (existsSync(copy) ? readFileSync(copy, 'utf8') : '')).toContain('"width": 9500')

  await app.close()
})

test('fermer un projet modifié pose la question', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  const requestClose = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())

  // Annuler : la fenêtre reste ouverte et le travail aussi
  await requestClose()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')

  // Enregistrer, puis renoncer dans la boîte de dialogue : on reste ici
  await chooseFile(app, null)
  await requestClose()
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page).toHaveTitle('* Nouveau meuble – CotaBois')

  // Enregistrer pour de bon : le fichier existe et la fenêtre se ferme
  const path = join(dir, 'ferme.cotabois')
  await chooseFile(app, path)
  await requestClose()
  const closed = app.waitForEvent('close')
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await closed
  expect(JSON.parse(readFileSync(path, 'utf8')).pieces).toHaveLength(8)
})

test('abandonner les modifications ferme sans enregistrer', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
  const closed = app.waitForEvent('close')
  // La fenêtre se ferme pendant le clic : c'est l'événement de fermeture qui fait foi.
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Ne pas enregistrer' })
    .click()
    .catch(() => undefined)
  await closed
})

test('un projet non modifié se ferme sans question', async () => {
  const { app } = await launchApp()
  const closed = app.waitForEvent('close')
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close())
  await closed
})

test('nouveau et ouvrir posent aussi la question', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)

  await clickMenu(app, 'Nouveau')
  const dialog = page.getByRole('alertdialog')
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')

  await clickMenu(app, 'Nouveau')
  await dialog.getByRole('button', { name: 'Ne pas enregistrer' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '0')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
  await expect(field(page, 'Largeur')).toHaveValue('800')

  await createCaisson(page)
  await chooseFile(app, join(FIXTURES, 'valid-v1.cotabois'))
  await clickMenu(app, 'Ouvrir…')
  await dialog.getByRole('button', { name: 'Ne pas enregistrer' }).click()
  await expect(page).toHaveTitle('Bibliothèque du salon – CotaBois')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '2')

  await app.close()
})

test('un fichier invalide affiche un message et laisse le projet en cours intact', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  const path = join(dir, 'projet.cotabois')
  await chooseFile(app, path)
  await clickMenu(app, 'Enregistrer')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
  const before = await page.getByTestId('cut-list').innerText()

  const textFile = join(dir, 'note.cotabois')
  writeFileSync(textFile, 'Une simple note, renommée.')

  const cases: Array<[string, string]> = [
    [textFile, "n'est pas un projet"],
    [join(FIXTURES, 'corrupted.cotabois'), "n'est pas un projet"],
    [join(FIXTURES, 'no-version.cotabois'), "n'est pas un projet"],
    [join(FIXTURES, 'future-version.cotabois'), 'version plus récente'],
    [join(dir, 'absent.cotabois'), 'ouvert']
  ]
  for (const [file, message] of cases) {
    await chooseFile(app, file)
    await clickMenu(app, 'Ouvrir…')
    await expect(page.getByTestId('file-error')).toContainText(message)
    expect(await page.getByTestId('cut-list').innerText()).toBe(before)
    await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
    await page.getByTestId('file-error').getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByTestId('file-error')).toHaveCount(0)
  }

  // Le projet en cours garde son emplacement : l'échec n'a pas changé le chemin courant
  await commitField(page, 'Largeur', '950')
  await chooseFile(app, null)
  await clickMenu(app, 'Enregistrer')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
  expect(readFileSync(path, 'utf8')).toContain('"width": 9500')

  await app.close()
})

test("un enregistrement impossible affiche un message et garde le travail ouvert", async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)

  await chooseFile(app, join(dir, 'dossier-absent', 'projet.cotabois'))
  await clickMenu(app, 'Enregistrer')
  await expect(page.getByTestId('file-error')).toContainText("n'a pas pu être enregistré")
  await expect(page).toHaveTitle('* Nouveau meuble – CotaBois')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')

  await app.close()
})
