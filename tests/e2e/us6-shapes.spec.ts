import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chooseFile, launchApp } from './helpers'

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

function cutout(page: Page, index: number) {
  return page.getByRole('group', { name: new RegExp(`^Découpe ${index}`) })
}

async function commitCutoutField(page: Page, index: number, label: string, value: string) {
  const input = cutout(page, index).getByLabel(label, { exact: true })
  await input.fill(value)
  await input.press('Enter')
}

async function settle(page: Page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function addTablet(page: Page) {
  await page.getByRole('button', { name: 'Ajouter un panneau' }).click()
  await commitField(page, 'Nom', 'Tablette')
  await commitField(page, 'Longueur', '800')
  await commitField(page, 'Largeur', '300')
}

async function openEditor(page: Page) {
  await page.getByRole('button', { name: 'Modifier la forme' }).click()
  await expect(page.getByTestId('shape-preview')).toBeVisible()
}

async function roundCorner(page: Page, label: string, radius: string) {
  await field(page, `Type du coin ${label}`).selectOption('round')
  await commitField(page, `Rayon ${label}`, radius)
}

/** Fait glisser un élément de l'aperçu, d'un déplacement exprimé en millimètres de la pièce. */
async function dragInPreview(page: Page, testId: string, deltaU: number, deltaV: number) {
  const preview = page.getByTestId('shape-preview')
  const viewBoxWidth = Number((await preview.getAttribute('viewBox'))?.split(' ')[2])
  const previewBox = (await preview.boundingBox())!
  const pixelsPerMm = previewBox.width / viewBoxWidth

  const target = (await page.getByTestId(testId).boundingBox())!
  const startX = target.x + target.width / 2
  const startY = target.y + target.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + deltaU * pixelsPerMm, startY - deltaV * pixelsPerMm, { steps: 8 })
  await page.mouse.up()
  await settle(page)
}

test('F1 : arrondir les coins', async () => {
  const { app, page } = await launchApp()
  await addTablet(page)
  await openEditor(page)

  await roundCorner(page, 'haut gauche', '40')
  await roundCorner(page, 'haut droit', '40')
  await expect(page.getByTestId('shape-preview').locator('path').first()).toHaveAttribute('d', /A/)

  // Le côté gauche mesure 300 mm et le coin haut gauche en occupe 40
  await field(page, 'Type du coin bas gauche').selectOption('round')
  await field(page, 'Rayon bas gauche').fill('270')
  await field(page, 'Rayon bas gauche').press('Enter')
  await expect(page.getByRole('alert')).toContainText('260')

  // Annuler retire l'arrondi du coin bas gauche, et rien d'autre
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(field(page, 'Type du coin bas gauche')).toHaveValue('straight')
  await expect(field(page, 'Rayon haut gauche')).toHaveValue('40')

  // La poignée change le rayon, au millimètre près, en une seule action
  await dragInPreview(page, 'corner-handle-topLeft', 20, -20)
  const dragged = await field(page, 'Rayon haut gauche').inputValue()
  expect(dragged).toMatch(/^\d+$/)
  expect(Number(dragged)).toBeGreaterThan(40)
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(field(page, 'Rayon haut gauche')).toHaveValue('40')

  // La liste indique le rectangle de bois, et signale la forme
  await page.getByRole('button', { name: 'Terminer' }).click()
  await expect(cutRows(page).first()).toHaveText(/Tablette\s*Plan 1\s*800\s*300\s*18/)

  await app.close()
})

test('F2 : ajouter, modifier et déplacer des découpes', async () => {
  const { app, page } = await launchApp()
  await addTablet(page)
  await openEditor(page)

  await page.getByRole('button', { name: 'Encoche' }).click()
  await expect(cutout(page, 1).getByLabel('Longueur', { exact: true })).toHaveValue('50')
  await expect(cutout(page, 1).getByLabel('Largeur', { exact: true })).toHaveValue('30')
  await commitCutoutField(page, 1, "Rayon d'angle", '5')
  await expect(cutout(page, 1).getByLabel("Rayon d'angle", { exact: true })).toHaveValue('5')

  await page.getByRole('button', { name: 'Trou rond' }).click()
  await commitCutoutField(page, 2, 'Diamètre', '60')
  await commitCutoutField(page, 2, 'Distance horizontale', '150')
  await commitCutoutField(page, 2, 'Distance verticale', '150')

  // Hors de la pièce : refusé, et la valeur précédente reste la bonne
  await commitCutoutField(page, 2, 'Distance horizontale', '10')
  await expect(cutout(page, 2).getByRole('alert')).toContainText("à l'intérieur")
  await commitCutoutField(page, 2, 'Distance horizontale', '150')
  await expect(page.getByRole('alert')).toHaveCount(0)

  // Glisser le trou : au millimètre près, en une seule action annulable
  await dragInPreview(page, 'cutout-1', 40, 0)
  const moved = await cutout(page, 2).getByLabel('Distance horizontale', { exact: true }).inputValue()
  expect(moved).toMatch(/^\d+$/)
  expect(Number(moved)).toBeGreaterThan(170)
  await expect(cutout(page, 2).getByLabel('Distance verticale', { exact: true })).toHaveValue('150')
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(cutout(page, 2).getByLabel('Distance horizontale', { exact: true })).toHaveValue('150')

  // Le glissement s'arrête aux limites de la pièce
  await dragInPreview(page, 'cutout-1', 2000, 0)
  const atLimit = Number(await cutout(page, 2).getByLabel('Distance horizontale', { exact: true }).inputValue())
  expect(atLimit).toBeLessThanOrEqual(769)
  expect(atLimit).toBeGreaterThan(700)

  // Une encoche reste contre son bord quand on la fait glisser
  await dragInPreview(page, 'cutout-0', 30, 30)
  await expect(cutout(page, 1).getByLabel('Distance verticale', { exact: true })).toHaveValue('0')
  await expect(cutout(page, 1).getByLabel('Distance horizontale', { exact: true })).toHaveValue('0')

  // Changer de bord de référence ne déplace pas la découpe
  await cutout(page, 1).getByLabel('Référence horizontale', { exact: true }).selectOption('right')
  await expect(cutout(page, 1).getByLabel('Distance horizontale', { exact: true })).toHaveValue('750')

  await cutout(page, 2).getByRole('button', { name: 'Supprimer' }).click()
  await expect(cutout(page, 2)).toHaveCount(0)
  await expect(cutout(page, 1)).toHaveCount(1)

  await app.close()
})

test('F2 : un clic à travers un trou sélectionne la pièce située derrière', async () => {
  const { app, page } = await launchApp()

  // Un plancher, et au-dessus une tablette percée en son centre
  await page.getByRole('button', { name: 'Ajouter un panneau' }).click()
  await commitField(page, 'Nom', 'Plancher')
  await commitField(page, 'Longueur', '3000')
  await commitField(page, 'Largeur', '3000')
  await commitField(page, 'X (largeur)', '-1000')
  await commitField(page, 'Z (profondeur)', '-1000')

  await page.getByRole('button', { name: 'Ajouter un panneau' }).click()
  await commitField(page, 'Nom', 'Tablette')
  await commitField(page, 'Longueur', '800')
  await commitField(page, 'Largeur', '800')
  await commitField(page, 'X (largeur)', '0')
  await commitField(page, 'Y (hauteur)', '30')
  await commitField(page, 'Z (profondeur)', '0')
  await openEditor(page)
  await page.getByRole('button', { name: 'Trou rond' }).click()
  await commitCutoutField(page, 1, 'Diamètre', '400')
  await commitCutoutField(page, 1, 'Distance horizontale', '400')
  await commitCutoutField(page, 1, 'Distance verticale', '400')
  await page.getByRole('button', { name: 'Terminer' }).click()
  await page.getByTestId('viewport').click({ position: { x: 5, y: 300 } })
  await page.getByTestId('cut-list').locator('tbody tr', { hasText: 'Tablette' }).click()
  await page.keyboard.press('f')
  await settle(page)

  const raw = await page.getByTestId('viewport').getAttribute('data-handle-origin')
  const [x, y] = raw!.split(',').map(Number)
  await page.getByRole('button', { name: 'Fermer' }).click()
  await settle(page)

  await page.mouse.click(x!, y!)
  await expect(field(page, 'Nom')).toHaveValue('Plancher')

  await app.close()
})

test('F4 : une pièce retournée partage son plan, et une forme différente en a un autre', async () => {
  const { app, page } = await launchApp()
  const dir = mkdtempSync(join(tmpdir(), 'cotabois-shapes-'))
  try {
    await addTablet(page)
    await openEditor(page)
    await roundCorner(page, 'haut gauche', '40')
    await page.getByRole('button', { name: 'Trou rond' }).click()
    await page.getByRole('button', { name: 'Terminer' }).click()

    // La copie porte la même forme, retournée : même ligne, même plan
    await page.getByRole('button', { name: 'Dupliquer' }).click()
    await page.getByRole('button', { name: 'Pivoter autour de X' }).click()
    await page.getByRole('button', { name: 'Pivoter autour de X' }).click()

    // Mêmes cotes, un seul arrondi différent : une autre ligne, un autre plan
    await page.getByRole('button', { name: 'Dupliquer' }).click()
    await openEditor(page)
    await commitField(page, 'Rayon haut gauche', '50')
    await page.getByRole('button', { name: 'Terminer' }).click()

    await expect(cutRows(page)).toHaveCount(2)
    const texts = await cutRows(page).allInnerTexts()
    expect(texts.filter((text) => /Plan 1/.test(text))).toHaveLength(1)
    expect(texts.filter((text) => /Plan 2/.test(text))).toHaveLength(1)
    expect(texts.some((text) => /^2\s/.test(text))).toBe(true)
    expect(texts.some((text) => /^1\s/.test(text))).toBe(true)

    // Le CSV renvoie aux plans
    const csvPath = join(dir, 'liste.csv')
    await chooseFile(app, csvPath)
    await page.getByRole('button', { name: 'Exporter en CSV' }).click()
    await expect.poll(() => existsSync(csvPath)).toBe(true)
    const csv = readFileSync(csvPath, 'utf8').replace('﻿', '').split('\r\n')
    expect(csv[0]).toMatch(/;Plan$/)
    expect(csv.slice(1, 3).map((row) => row.split(';').at(-1)).sort()).toEqual(['1', '2'])

    // Le rapport contient un plan par forme distincte, le temps de l'impression
    const pdfPath = join(dir, 'liste.pdf')
    await chooseFile(app, pdfPath)
    await page.getByRole('button', { name: 'Exporter en PDF' }).click()
    await expect.poll(() => existsSync(pdfPath), { timeout: 20_000 }).toBe(true)
    const pdf = readFileSync(pdfPath).toString('latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf.match(/\/Type\s*\/Page\b(?!s)/g)!.length).toBeGreaterThanOrEqual(1)
  } finally {
    await app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('F4 : le rapport imprimé contient un plan par forme, avec ses cotes', async () => {
  const { app, page } = await launchApp()
  await addTablet(page)
  await openEditor(page)
  await roundCorner(page, 'haut gauche', '40')
  await page.getByRole('button', { name: 'Trou rond' }).click()
  await commitCutoutField(page, 1, 'Diamètre', '60')
  await page.getByRole('button', { name: 'Terminer' }).click()

  // La boîte de dialogue attend : le rapport reste en place, et on peut l'observer.
  await app.evaluate(({ dialog }) => {
    dialog.showSaveDialog = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return { canceled: true, filePath: '' }
    }) as unknown as typeof dialog.showSaveDialog
  })
  await page.getByRole('button', { name: 'Exporter en PDF' }).click()

  const plans = page.getByTestId('shape-plan')
  await expect(plans).toHaveCount(1)
  await expect(plans).toContainText('Plan 1')
  await expect(plans).toContainText('Coin haut gauche : arrondi R 40')
  await expect(plans).toContainText('Trou rond Ø 60')
  await expect(page.getByTestId('report')).toHaveCount(0)

  await app.close()
})

test('F3 : un montant logé dans une encoche n\'est pas un chevauchement', async () => {
  const { app, page } = await launchApp()
  await addTablet(page)
  await openEditor(page)
  await page.getByRole('button', { name: 'Encoche' }).click()
  await page.getByRole('button', { name: 'Terminer' }).click()
  await page.getByRole('button', { name: 'Fermer' }).click()

  // Un montant de section 50 × 30 mm : la longueur suit la hauteur après un quart de tour
  await page.getByRole('button', { name: 'Ajouter un panneau' }).click()
  await commitField(page, 'Nom', 'Montant')
  await commitField(page, 'Longueur', '300')
  await commitField(page, 'Largeur', '30')
  await commitField(page, 'Épaisseur', '50')
  await page.getByRole('button', { name: 'Pivoter autour de Z' }).click()
  await commitField(page, 'X (largeur)', '0')
  await commitField(page, 'Y (hauteur)', '-100')
  await commitField(page, 'Z (profondeur)', '0')
  await settle(page)
  await expect(page.getByTestId('overlap-warning')).toHaveCount(0)

  // Décalé de 10 mm, il mord sur la tablette
  await commitField(page, 'X (largeur)', '10')
  await expect(page.getByTestId('overlap-warning')).toContainText('Tablette et Montant')

  await app.close()
})
