import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { chooseFile, clickMenu, launchApp } from './helpers'

const SHAPES_PROJECT = join(__dirname, '../fixtures/projects/valid-v2.cotabois')

test('un projet avec des pièces de forme s\'ouvre et s\'affiche sans erreur', async () => {
  const { app, page } = await launchApp()
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))

  await chooseFile(app, SHAPES_PROJECT)
  await clickMenu(app, 'Ouvrir…')
  await expect(page).toHaveTitle('Pièces de forme – CotaBois')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '3')
  await expect(page.getByTestId('file-error')).toHaveCount(0)

  // Une pièce de forme se sélectionne, et ses poignées apparaissent
  await page.getByTestId('cut-list').locator('tbody tr', { hasText: 'Montant' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-handle-x', /.+/)
  await page.keyboard.press('f')

  expect(errors).toEqual([])
  await app.close()
})
