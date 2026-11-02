import { expect, test } from '@playwright/test'
import { launchApp } from './helpers'

test('la fenêtre CotaBois s\'ouvre', async () => {
  const { app, page } = await launchApp()
  await expect(page).toHaveTitle(/CotaBois/)
  await app.close()
})
