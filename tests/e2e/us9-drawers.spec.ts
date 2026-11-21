import { expect, test, type Page } from '@playwright/test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
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

function cutRows(page: Page) {
  return page.getByTestId('cut-list').locator('tbody tr')
}

async function chooseDrawers(page: Page) {
  await field(page, 'Modèle').selectOption({ label: 'Meuble à tiroirs' })
}

async function createReference(page: Page) {
  await chooseDrawers(page)
  await page.getByRole('button', { name: 'Créer le meuble à tiroirs' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '23')
}

test('T1 : le meuble de référence donne la liste calculée à la main', async () => {
  const { app, page } = await launchApp()
  await chooseDrawers(page)

  // Les valeurs par défaut sont celles du meuble de référence ; les réglages fins sont repliés.
  await expect(field(page, 'Largeur')).toHaveValue('600')
  await expect(field(page, 'Hauteur')).toHaveValue('720')
  await expect(field(page, 'Profondeur')).toHaveValue('560')
  await expect(field(page, 'Nombre de tiroirs')).toHaveValue('3')
  await expect(field(page, 'Jeu entre façades')).toBeHidden()
  await page.getByText('Réglages des tiroirs').click()
  await expect(field(page, 'Jeu entre façades')).toHaveValue('3')
  await expect(field(page, 'Jeu des coulisses')).toHaveValue('12,5')
  await expect(field(page, 'Épaisseur du bois des tiroirs')).toHaveValue('15')
  await expect(field(page, 'Épaisseur du fond des tiroirs')).toHaveValue('5')

  await page.getByRole('button', { name: 'Créer le meuble à tiroirs' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '23')

  const rows = cutRows(page)
  await expect(rows).toHaveCount(7)
  await expect(rows.nth(0)).toHaveText(/^2\s*Côté gauche, Côté droit\s*720\s*555\s*18/)
  await expect(rows.nth(1)).toHaveText(/^3\s*Façade 1, Façade 2, Façade 3\s*597\s*237\s*18/)
  await expect(rows.nth(2)).toHaveText(/^2\s*Dessous, Dessus\s*564\s*555\s*18/)
  await expect(rows.nth(3)).toHaveText(/^6\s*Tiroir 1 avant, Tiroir 1 arrière, .*Tiroir 3 arrière\s*509\s*197\s*15/)
  await expect(rows.nth(4)).toHaveText(/^6\s*Tiroir 1 côté gauche, Tiroir 1 côté droit, .*Tiroir 3 côté droit\s*500\s*197\s*15/)
  await expect(rows.nth(5)).toHaveText(/^1\s*Fond\s*720\s*600\s*5/)
  await expect(rows.nth(6)).toHaveText(/^3\s*Tiroir 1 fond, Tiroir 2 fond, Tiroir 3 fond\s*539\s*500\s*5/)
  await expect(page.getByTestId('overlap-warning')).toHaveCount(0)

  // Le formulaire reste celui du meuble à tiroirs, prêt à l'ajuster.
  await expect(field(page, 'Modèle')).toHaveValue('drawers')
  await expect(page.getByRole('button', { name: 'Créer le meuble à tiroirs' })).toHaveCount(0)

  await app.close()
})

test('T3 : une saisie impossible est refusée avec la limite, sans rien créer', async () => {
  const { app, page } = await launchApp()
  await chooseDrawers(page)
  const create = page.getByRole('button', { name: 'Créer le meuble à tiroirs' })

  await field(page, 'Nombre de tiroirs').fill('10')
  await create.click()
  await expect(page.getByRole('alert')).toContainText('7 au maximum')
  await expect(field(page, 'Nombre de tiroirs')).toHaveAttribute('aria-invalid', 'true')
  await field(page, 'Nombre de tiroirs').fill('3')

  await field(page, 'Profondeur').fill('250')
  await create.click()
  await expect(page.getByRole('alert')).toContainText('265 mm')
  await field(page, 'Profondeur').fill('560')

  await field(page, 'Largeur').fill('80')
  await create.click()
  await expect(page.getByRole('alert')).toContainText('largeur')
  await expect(field(page, 'Largeur')).toHaveAttribute('aria-invalid', 'true')

  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '0')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')

  // Un réglage replié refusé ouvre la section pour montrer le message.
  await field(page, 'Largeur').fill('600')
  await page.getByText('Réglages des tiroirs').click()
  await field(page, 'Jeu des coulisses').fill('51')
  await page.getByText('Réglages des tiroirs').click()
  await expect(field(page, 'Jeu des coulisses')).toBeHidden()
  await create.click()
  await expect(field(page, 'Jeu des coulisses')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('50 mm')

  await app.close()
})

test('T4 : le meuble se recalcule, en une action annulable, avec confirmation après une retouche', async () => {
  const { app, page } = await launchApp()
  await createReference(page)

  await commitField(page, 'Nombre de tiroirs', '4')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '29')
  await expect(cutRows(page).filter({ hasText: 'Façade 4' })).toHaveCount(1)

  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '23')
  await expect(field(page, 'Nombre de tiroirs')).toHaveValue('3')

  // Retoucher une pièce, puis changer la largeur : on demande avant de remplacer.
  await cutRows(page).filter({ hasText: /^1\s*Fond/ }).click()
  await commitField(page, 'Matériau', 'Contreplaqué')
  await page.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByText('Ce meuble a été ajusté à la main.')).toBeVisible()

  await commitField(page, 'Largeur', '800')
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Changer les dimensions du meuble remplacera les ajustements faits à la main.')
  await dialog.getByRole('button', { name: 'Garder mes ajustements' }).click()
  await expect(field(page, 'Largeur')).toHaveValue('600')
  await expect(page.getByTestId('cut-list')).toContainText('Contreplaqué')

  await commitField(page, 'Largeur', '800')
  await dialog.getByRole('button', { name: 'Remplacer' }).click()
  await expect(cutRows(page).filter({ hasText: 'Façade 1' })).toHaveText(/^3\s*Façade 1, Façade 2, Façade 3\s*797\s*237/)
  await expect(page.getByTestId('cut-list')).not.toContainText('Contreplaqué')
  await expect(page.getByText('ajusté à la main')).toHaveCount(0)

  await app.close()
})

test('T5 : passer du caisson au meuble à tiroirs, puis le retrouver à la réouverture', async () => {
  const path = join(dir, 'commode.cotabois')
  const first = await launchApp()
  const page = first.page

  // Le caisson est celui d'avant le meuble à tiroirs
  await field(page, "Nombre d'étagères").fill('3')
  await page.getByRole('button', { name: 'Créer le caisson' }).click()
  const rows = cutRows(page)
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toHaveText(/^2\s*Côté gauche, Côté droit\s*1800\s*395\s*18/)
  await expect(rows.nth(1)).toHaveText(/^5\s*Dessous, Dessus, Étagère 1, Étagère 2, Étagère 3\s*764\s*395\s*18/)
  await expect(rows.nth(2)).toHaveText(/^1\s*Fond\s*1800\s*800\s*5/)

  // Changer de modèle demande confirmation ; renoncer garde le caisson
  await chooseDrawers(page)
  await field(page, 'Nombre de tiroirs').fill('4')
  await page.getByText('Réglages des tiroirs').click()
  await field(page, 'Jeu des coulisses').fill('13')
  const create = page.getByRole('button', { name: 'Créer le meuble à tiroirs' })
  await create.click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Créer un meuble à tiroirs remplacera le caisson.')
  await dialog.getByRole('button', { name: 'Garder mes ajustements' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')

  await field(page, 'Nombre de tiroirs').fill('4')
  await field(page, 'Jeu des coulisses').fill('13')
  await create.click()
  await dialog.getByRole('button', { name: 'Remplacer' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '29')

  await chooseFile(first.app, path)
  await clickMenu(first.app, 'Enregistrer')
  await expect(page).toHaveTitle('Nouveau meuble – CotaBois')
  const savedList = await page.getByTestId('cut-list').innerText()
  await first.app.close()

  const saved = JSON.parse(readFileSync(path, 'utf8'))
  expect(saved.formatVersion).toBe(5)
  expect(saved.template.kind).toBe('drawers')
  expect(saved.template.params).toMatchObject({ drawerCount: 4, slideGap: 130, frontEdges: false })

  const second = await launchApp()
  await chooseFile(second.app, path)
  await clickMenu(second.app, 'Ouvrir…')
  await expect(field(second.page, 'Modèle')).toHaveValue('drawers')
  await expect(field(second.page, 'Nombre de tiroirs')).toHaveValue('4')
  await second.page.getByText('Réglages des tiroirs').click()
  await expect(field(second.page, 'Jeu des coulisses')).toHaveValue('13')
  expect(await second.page.getByTestId('cut-list').innerText()).toBe(savedList)

  // Revenir au caisson propose de le créer, avec ses propres valeurs
  await field(second.page, 'Modèle').selectOption({ label: 'Caisson' })
  await expect(field(second.page, 'Largeur')).toHaveValue('800')
  await second.page.getByRole('button', { name: 'Créer le caisson' }).click()
  await expect(second.page.getByRole('alertdialog')).toContainText('Créer un caisson remplacera le meuble à tiroirs.')
  await second.app.close()
})

test('T7 : les projets des versions 1 à 4 affichent le caisson, ceux de la version 5 leur modèle', async () => {
  const { app, page } = await launchApp()
  const cases: Array<[string, string, string]> = [
    ['valid-v1.cotabois', 'caisson', '2'],
    ['valid-v2.cotabois', 'caisson', '3'],
    ['valid-v3.cotabois', 'caisson', '2'],
    ['valid-v4.cotabois', 'caisson', '3'],
    ['valid-v5.cotabois', 'drawers', '2']
  ]
  for (const [file, kind, count] of cases) {
    await chooseFile(app, join(FIXTURES, file))
    await clickMenu(app, 'Ouvrir…')
    await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', count)
    await expect(field(page, 'Modèle')).toHaveValue(kind)
  }
  // La commode de la version 5 est retouchée : ses réglages s'affichent, et la note aussi.
  await expect(field(page, 'Nombre de tiroirs')).toHaveValue('3')
  await expect(page.getByText('Ce meuble a été ajusté à la main.')).toBeVisible()
  await app.close()
})

test('T6 : chants sur les bords avant et calepinage en trois épaisseurs', async () => {
  const { app, page } = await launchApp()
  await chooseDrawers(page)
  await page.getByLabel('Chants sur les bords avant').check()
  await page.getByRole('button', { name: 'Créer le meuble à tiroirs' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '23')

  const rows = cutRows(page)
  await expect(rows.filter({ hasText: 'Façade 1' })).toContainText('2 longs, 2 courts')
  await expect(rows.filter({ hasText: /^2\s*Côté gauche, Côté droit/ })).toContainText('1 long')
  await expect(rows.filter({ hasText: /^2\s*Dessous, Dessus/ })).toContainText('1 long')
  await expect(rows.filter({ hasText: 'Tiroir 1 avant' })).not.toContainText('long')
  await expect(rows.filter({ hasText: 'Tiroir 1 fond' })).not.toContainText('long')

  // Décocher régénère le meuble sans chant
  await page.getByLabel('Chants sur les bords avant').uncheck()
  await expect(rows.filter({ hasText: 'Façade 1' })).not.toContainText('courts')
  await page.getByLabel('Chants sur les bords avant').check()

  await page.getByRole('button', { name: 'Calepinage', exact: true }).click()
  const groups = page.getByTestId('layout-view').locator('section.layout-group')
  await expect(groups).toHaveCount(3)
  for (const label of ['sans matériau, 18 mm', 'sans matériau, 15 mm', 'sans matériau, 5 mm']) {
    await expect(page.getByRole('region', { name: `Panneaux ${label}` })).toBeVisible()
  }
  await expect(page.getByRole('region', { name: 'Panneaux sans matériau, 18 mm' })).toContainText('chant')
  await app.close()
})
