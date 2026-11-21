import { expect, test, type Page } from '@playwright/test'
import { launchApp } from './helpers'

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
