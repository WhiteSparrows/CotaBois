import { _electron as electron, expect, test, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { chooseFile, cleanEnv, clickMenu, launchApp } from './helpers'

const LARGE_PROJECT = join(__dirname, '../fixtures/projects/200-pieces.cotabois')
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

test('SC-004 et SC-005 : 200 pièces restent fluides', async () => {
  const { app, page } = await launchApp()
  await chooseFile(app, LARGE_PROJECT)
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
  console.log(`Modification sur 200 pièces : médiane ${median(durations).toFixed(0)} ms, max ${Math.max(...durations).toFixed(0)} ms`)
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
    `Rotation sur 200 pièces : ${frames.length} images, médiane ${median(frames).toFixed(1)} ms, ` +
      `95e centile ${p95.toFixed(1)} ms, max ${Math.max(...frames).toFixed(1)} ms`
  )
  // 30 images par seconde au moins, 95 % du temps
  expect(p95).toBeLessThan(34)

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
