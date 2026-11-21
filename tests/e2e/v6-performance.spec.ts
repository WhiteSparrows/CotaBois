import { _electron as electron, expect, test, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { chooseFile, cleanEnv, clickMenu, launchApp } from './helpers'

const LARGE_PROJECT = join(__dirname, '../fixtures/projects/200-pieces.cotabois')
const LARGE_SHAPES_PROJECT = join(__dirname, '../fixtures/projects/200-pieces-shapes.cotabois')
const EXECUTABLE = join(__dirname, '../../dist/win-unpacked/CotaBois.exe')

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * ratio)] ?? 0
}

/** Du changement de cote jusqu'à l'image suivante, vue 3D et liste à jour. */
function measureLengthChange(page: Page, value: string): Promise<number> {
  return page.evaluate(async (next) => {
    const label = [...document.querySelectorAll('label')].find((candidate) => candidate.textContent === 'Longueur')
    const input = document.getElementById(label?.htmlFor ?? '') as HTMLInputElement
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setValue?.call(input, next)
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const start = performance.now()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return performance.now() - start
  }, value)
}

const LARGE_PROJECTS: ReadonlyArray<[string, string]> = [
  ['200 rectangles', LARGE_PROJECT],
  ['200 pièces dont 50 de forme', LARGE_SHAPES_PROJECT]
]

for (const [label, projectPath] of LARGE_PROJECTS) test(`SC-004 et SC-005 : fluidité avec ${label}`, async () => {
  const { app, page } = await launchApp()
  await chooseFile(app, projectPath)
  await clickMenu(app, 'Ouvrir…')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '200')

  // Une modification : du cœur jusqu'à la vue 3D et à la liste
  const row = page.getByTestId('cut-list').locator('tbody tr', { hasText: 'Repère' })
  await row.click()
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Repère')

  const durations: number[] = []
  for (let i = 1; i <= 9; i++) {
    const length = String(1800 + i)
    durations.push(await measureLengthChange(page, length))
    await expect(row).toContainText(length)
  }
  console.log(`Modification (${label}) : médiane ${median(durations).toFixed(0)} ms, max ${Math.max(...durations).toFixed(0)} ms`)
  expect(Math.max(...durations)).toBeLessThan(1000)

  // Rotation de la vue : écart entre deux images, pendant un long glissement
  await page.keyboard.press('Escape')
  await page.getByTestId('cut-list').locator('tbody tr').first().focus().catch(() => undefined)
  await page.evaluate(() => {
    const samples: number[] = []
    let last = performance.now()
    const recorder = { samples, running: true }
    ;(globalThis as { frameRecorder?: typeof recorder }).frameRecorder = recorder
    const tick = (now: number) => {
      samples.push(now - last)
      last = now
      if (recorder.running) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  const box = (await page.getByTestId('viewport').boundingBox())!
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  // Sans image qui change, les écarts mesurés ne seraient que la fréquence de l'écran.
  const before = await page.getByTestId('viewport').screenshot()
  await page.mouse.move(centerX, centerY)
  await page.mouse.down()
  for (let round = 0; round < 3; round++) {
    await page.mouse.move(centerX - 150, centerY - 40, { steps: 60 })
    await page.mouse.move(centerX + 150, centerY + 40, { steps: 60 })
  }
  await page.mouse.up()
  const after = await page.getByTestId('viewport').screenshot()
  expect(before.equals(after)).toBe(false)

  const frames = await page.evaluate(() => {
    const recorder = (globalThis as { frameRecorder?: { samples: number[]; running: boolean } }).frameRecorder!
    recorder.running = false
    return recorder.samples.slice(1)
  })
  const p95 = percentile(frames, 0.95)
  console.log(
    `Rotation (${label}) : ${frames.length} images, médiane ${median(frames).toFixed(1)} ms, ` +
      `95e centile ${p95.toFixed(1)} ms, max ${Math.max(...frames).toFixed(1)} ms`
  )
  // 30 images par seconde au moins, 95 % du temps
  expect(p95).toBeLessThan(34)

  await app.close()
})

test('SC-005 : le calepinage de 200 pièces s\'affiche en moins de 2 secondes', async () => {
  const { app, page } = await launchApp()
  await chooseFile(app, LARGE_SHAPES_PROJECT)
  await clickMenu(app, 'Ouvrir…')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '200')

  const durations: number[] = []
  for (let run = 0; run < 3; run++) {
    const start = Date.now()
    await page.getByRole('button', { name: 'Calepinage', exact: true }).click()
    await page.getByTestId('layout-panel').first().waitFor()
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    durations.push(Date.now() - start)
    await page.getByRole('button', { name: 'Vue 3D' }).click()
    await expect(page.getByTestId('layout-view')).toHaveCount(0)
  }
  console.log(`Calepinage (200 pièces dont 50 de forme) : médiane ${median(durations)} ms, max ${Math.max(...durations)} ms`)
  expect(Math.max(...durations)).toBeLessThan(2000)
  await app.close()
})

test('SC-005 des chants : poser un chant sur de nombreuses pièces met à jour la vue en moins de 1 seconde', async () => {
  const { app, page } = await launchApp()
  await chooseFile(app, LARGE_SHAPES_PROJECT)
  await clickMenu(app, 'Ouvrir…')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '200')

  // La ligne qui regroupe le plus de pièces
  const quantities = await page.getByTestId('cut-list').locator('tbody tr td:first-child').allInnerTexts()
  const largest = quantities.map(Number).reduce((best, quantity, index, all) => (quantity > all[best]! ? index : best), 0)
  await page.getByTestId('cut-list').locator('tbody tr').nth(largest).click()
  const count = Number(quantities[largest])

  const durations: number[] = []
  for (const edge of ['Bord haut', 'Bord bas', 'Bord gauche', 'Bord droit']) {
    durations.push(
      await page.evaluate(async (label) => {
        const box = [...document.querySelectorAll('label')].find((candidate) => candidate.textContent?.trim() === label)?.querySelector('input')
        const start = performance.now()
        box!.click()
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        return performance.now() - start
      }, edge)
    )
  }
  const bands = Number(await page.getByTestId('viewport').getAttribute('data-edge-band-count'))
  console.log(`Chants (${count} pièces sélectionnées sur 200) : médiane ${median(durations).toFixed(0)} ms, max ${Math.max(...durations).toFixed(0)} ms`)
  expect(bands).toBe(4 * count)
  expect(Math.max(...durations)).toBeLessThan(1000)
  await app.close()
})

test.describe('démarrage', () => {
  test.skip(!existsSync(EXECUTABLE), 'Exécuter `npm run pack` avant ce test')

  test('SC-002 : le logiciel empaqueté est utilisable en moins de 5 secondes', async () => {
    const durations: number[] = []
    for (let run = 0; run < 5; run++) {
      const start = Date.now()
      const app = await electron.launch({ executablePath: EXECUTABLE, env: cleanEnv() })
      const page = await app.firstWindow()
      await page.getByRole('button', { name: 'Créer le caisson' }).waitFor()
      durations.push(Date.now() - start)
      await app.close()
    }
    console.log(`Démarrage : médiane ${median(durations)} ms, max ${Math.max(...durations)} ms (${durations.join(', ')})`)
    expect(Math.max(...durations)).toBeLessThan(5000)
  })
})
