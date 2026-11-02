import { expect, test, type Page } from '@playwright/test'
import { launchApp } from './helpers'

async function fillCaisson(page: Page, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value)
  }
}

async function commitField(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(value)
  await input.press('Enter')
}

const REFERENCE = {
  Largeur: '800',
  Hauteur: '1800',
  Profondeur: '400',
  'Épaisseur du bois': '18',
  'Épaisseur du fond': '5',
  "Nombre d'étagères": '3'
}

function cutRows(page: Page) {
  return page.getByTestId('cut-list').locator('tbody tr')
}

test('V1 : du caisson à la liste de découpe', async () => {
  const { app, page } = await launchApp()
  await expect(page.getByText('Saisissez les dimensions')).toBeVisible()

  await fillCaisson(page, REFERENCE)
  await page.getByRole('button', { name: 'Créer le caisson' }).click()

  const rows = cutRows(page)
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toHaveText(/^2\s*Côté gauche, Côté droit\s*1800\s*395\s*18/)
  await expect(rows.nth(1)).toHaveText(/^5\s*Dessous, Dessus, Étagère 1, Étagère 2, Étagère 3\s*764\s*395\s*18/)
  await expect(rows.nth(2)).toHaveText(/^1\s*Fond\s*1800\s*800\s*5/)

  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')
  await expect(page.getByTestId('overall-size')).toHaveText('800 × 1800 × 400 mm')
  await expect(page.getByTestId('cut-totals')).toContainText('2,93 m²')
  await expect(page.getByTestId('cut-totals')).toContainText('1,44 m²')

  // Le fond à 0 : plus de ligne de fond, et les profondeurs passent à 400
  await commitField(page, 'Épaisseur du fond', '0')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toHaveText(/1800\s*400\s*18/)
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '7')

  await app.close()
})

test('V2 : les saisies impossibles sont refusées et le meuble ne change pas', async () => {
  const { app, page } = await launchApp()
  await fillCaisson(page, REFERENCE)
  await page.getByRole('button', { name: 'Créer le caisson' }).click()
  await expect(cutRows(page)).toHaveCount(3)
  const before = await page.getByTestId('cut-list').innerText()

  const cases: Array<[string, string, string]> = [
    ['Largeur', '30', 'deux épaisseurs'],
    ['Profondeur', 'abc', 'Saisissez un nombre'],
    ['Épaisseur du bois', '18,55', '0,1 mm'],
    // Hauteur intérieure : 1764 mm, et 98 × 18 mm la remplissent exactement
    ["Nombre d'étagères", '2000', '97 au maximum']
  ]
  for (const [label, value, message] of cases) {
    await commitField(page, label, value)
    await expect(page.getByRole('alert')).toContainText(message)
    expect(await page.getByTestId('cut-list').innerText()).toBe(before)
    await commitField(page, label, REFERENCE[label as keyof typeof REFERENCE])
    await expect(page.getByRole('alert')).toHaveCount(0)
  }

  // Virgule et point sont acceptés
  await commitField(page, 'Largeur', '800,5')
  await expect(cutRows(page).nth(1)).toHaveText(/764,5\s*395\s*18/)
  await commitField(page, 'Largeur', '800.5')
  await expect(cutRows(page).nth(1)).toHaveText(/764,5\s*395\s*18/)

  await app.close()
})
