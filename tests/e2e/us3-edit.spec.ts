import { expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { launchApp } from './helpers'

type Axis = 'x' | 'y' | 'z'

const POSITION_LABELS: Record<Axis, string> = {
  x: 'X (largeur)',
  y: 'Y (hauteur)',
  z: 'Z (profondeur)'
}

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

async function clickMenu(app: ElectronApplication, label: string) {
  await app.evaluate(({ Menu }, wanted) => {
    const items = Menu.getApplicationMenu()?.items.flatMap((item) => item.submenu?.items ?? []) ?? []
    items.find((item) => item.label === wanted)?.click()
  }, label)
}

/** Laisse la vue 3D et les panneaux se redessiner. */
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
}

async function readPosition(page: Page, axis: Axis): Promise<number> {
  await settle(page)
  return Number((await field(page, POSITION_LABELS[axis]).inputValue()).replace(',', '.'))
}

async function handlePoint(page: Page, name: string): Promise<{ x: number; y: number }> {
  await settle(page)
  const raw = await page.getByTestId('viewport').getAttribute(`data-handle-${name}`)
  if (!raw) throw new Error(`Poignée absente : ${name}`)
  const [x, y] = raw.split(',').map(Number)
  return { x: x!, y: y! }
}

async function dragHandle(page: Page, axis: Axis, pixels: number) {
  const origin = await handlePoint(page, 'origin')
  const start = await handlePoint(page, axis)
  const dx = start.x - origin.x
  const dy = start.y - origin.y
  const length = Math.hypot(dx, dy)
  await page.mouse.move(start.x, start.y)
  await page.mouse.move(start.x + 1, start.y)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + (dx / length) * pixels, start.y + (dy / length) * pixels, { steps: 6 })
  await page.mouse.up()
}

/** Fait glisser la poignée jusqu'à la cote voulue, en mesurant d'abord l'échelle de la vue. */
async function dragHandleTo(page: Page, axis: Axis, target: number) {
  const before = await readPosition(page, axis)
  await dragHandle(page, axis, before < target ? 40 : -40)
  let current = await readPosition(page, axis)
  const millimetersPerPixel = Math.abs(current - before) / 40
  if (millimetersPerPixel === 0) throw new Error(`La poignée ${axis} n'a pas réagi`)
  for (let attempt = 0; attempt < 4 && current !== target; attempt++) {
    await dragHandle(page, axis, (target - current) / millimetersPerPixel)
    current = await readPosition(page, axis)
  }
}

async function addPanel(page: Page) {
  await page.getByRole('button', { name: 'Ajouter un panneau' }).click()
}

async function createCaisson(page: Page) {
  await field(page, "Nombre d'étagères").fill('3')
  await page.getByRole('button', { name: 'Créer le caisson' }).click()
  await expect(cutRows(page)).toHaveCount(3)
}

test('V3 : construire une table depuis un projet vide', async () => {
  const { app, page } = await launchApp()
  await expect(page.getByText('ajoutez un panneau')).toBeVisible()

  // Le plateau
  await addPanel(page)
  await commitField(page, 'Nom', 'Plateau')
  await commitField(page, 'Longueur', '1200')
  await commitField(page, 'Largeur', '700')
  await commitField(page, 'Épaisseur', '30')
  await commitField(page, POSITION_LABELS.y, '720')
  await expect(page.getByTestId('overall-size')).toHaveText('1200 × 30 × 700 mm')

  // Un pied debout, placé à la poignée : l'alignement doit donner des cotes exactes
  await addPanel(page)
  await commitField(page, 'Nom', 'Pied')
  await commitField(page, 'Longueur', '720')
  await commitField(page, 'Largeur', '60')
  await commitField(page, 'Épaisseur', '60')
  await page.getByRole('button', { name: 'Pivoter autour de Z' }).click()

  const listBeforeRotation = await page.getByTestId('cut-list').innerText()
  await page.getByRole('button', { name: 'Pivoter autour de X' }).click()
  await page.getByRole('button', { name: 'Pivoter autour de X' }).click()
  expect(await page.getByTestId('cut-list').innerText()).toBe(listBeforeRotation)

  await page.keyboard.press('f')
  await dragHandleTo(page, 'y', 0)
  expect(await readPosition(page, 'y')).toBe(0)
  await dragHandleTo(page, 'x', 1140)
  expect(await readPosition(page, 'x')).toBe(1140)
  await expect(page.getByTestId('overall-size')).toContainText('1200 × 750')

  // Les trois autres pieds, par duplication
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Dupliquer' }).click()

  const rows = cutRows(page)
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toHaveText(/^4\s*Pied, Pied \(copie\).*720\s*60\s*60/)
  await expect(rows.nth(1)).toHaveText(/^1\s*Plateau\s*1200\s*700\s*30/)
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '5')

  await app.close()
})

test('annuler et rétablir reviennent exactement aux états précédents', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  const initial = await page.getByTestId('cut-list').innerText()

  await cutRows(page).nth(2).click()
  await commitField(page, 'Épaisseur', '8')
  const edited = await page.getByTestId('cut-list').innerText()
  expect(edited).not.toBe(initial)

  await clickMenu(app, 'Annuler')
  expect(await page.getByTestId('cut-list').innerText()).toBe(initial)
  await expect(field(page, 'Épaisseur')).toHaveValue('5')

  await clickMenu(app, 'Rétablir')
  expect(await page.getByTestId('cut-list').innerText()).toBe(edited)
  await expect(field(page, 'Épaisseur')).toHaveValue('8')

  await page.getByRole('button', { name: 'Annuler' }).click()
  expect(await page.getByTestId('cut-list').innerText()).toBe(initial)
  await page.getByRole('button', { name: 'Rétablir' }).click()
  expect(await page.getByTestId('cut-list').innerText()).toBe(edited)

  // Une seule action par glissement, même s'il traverse beaucoup de positions
  await clickMenu(app, 'Annuler')
  await cutRows(page).nth(2).click()
  const start = await readPosition(page, 'x')
  await dragHandle(page, 'x', 80)
  expect(await readPosition(page, 'x')).not.toBe(start)
  await page.getByRole('button', { name: 'Annuler' }).click()
  expect(await readPosition(page, 'x')).toBe(start)

  await app.close()
})

test('sélection croisée entre la vue 3D et la liste', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)

  // Un clic au centre de la vue sélectionne une pièce du caisson
  const box = (await page.getByTestId('viewport').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByRole('button', { name: 'Fermer' })).toBeVisible()
  await expect(page.getByTestId('cut-list').locator('tr[data-selected="true"]')).toHaveCount(1)

  // Un clic dans le vide désélectionne, et le formulaire du caisson revient
  await page.mouse.click(box.x + 8, box.y + box.height - 8)
  await expect(field(page, 'Hauteur')).toBeVisible()
  await expect(page.getByTestId('cut-list').locator('tr[data-selected="true"]')).toHaveCount(0)

  // Une ligne de 5 pièces les sélectionne toutes
  await cutRows(page).nth(1).click()
  await expect(page.getByText('5 pièces sélectionnées')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(field(page, 'Hauteur')).toBeVisible()

  await app.close()
})

test('le chevauchement est signalé sans bloquer', async () => {
  const { app, page } = await launchApp()
  await addPanel(page)
  await commitField(page, 'Nom', 'A')
  await addPanel(page)
  await commitField(page, 'Nom', 'B')
  await expect(page.getByTestId('overlap-warning')).toHaveCount(0)

  await commitField(page, POSITION_LABELS.x, '100')
  await expect(page.getByTestId('overlap-warning')).toContainText('A et B')
  await expect(cutRows(page)).toHaveCount(1)

  // Le contact bord à bord n'est pas un chevauchement
  await commitField(page, POSITION_LABELS.x, '600')
  await expect(page.getByTestId('overlap-warning')).toHaveCount(0)

  await app.close()
})

test('supprimer, y compris avec la touche Suppr, sans gêner la saisie', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)

  await cutRows(page).nth(2).click()
  // Dans un champ, Suppr et « f » restent de la simple saisie
  await field(page, 'Nom').fill('Fond')
  await field(page, 'Nom').press('Home')
  await field(page, 'Nom').press('Delete')
  await expect(field(page, 'Nom')).toHaveValue('ond')
  await field(page, 'Nom').press('f')
  await expect(field(page, 'Nom')).toHaveValue('fond')
  await expect(cutRows(page)).toHaveCount(3)

  await page.getByRole('button', { name: 'Fermer' }).click()
  await cutRows(page).nth(2).click()
  await page.getByTestId('cut-list').locator('tr[data-selected="true"] button').focus()
  await page.keyboard.press('Delete')
  await expect(cutRows(page)).toHaveCount(2)
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '7')

  // La dernière pièce peut disparaître aussi
  await cutRows(page).nth(0).click()
  await page.getByRole('button', { name: 'Supprimer' }).click()
  await cutRows(page).nth(0).click()
  await page.getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByText("Aucune pièce pour l'instant.")).toBeVisible()
  await expect(page.getByText('ajoutez un panneau')).toBeVisible()

  await app.close()
})

/** Un raccourci envoyé à la fenêtre, comme le clavier : il passe par la gestion du texte du navigateur. */
async function pressCtrl(app: ElectronApplication, keyCode: string) {
  await app.evaluate(({ BrowserWindow }, code) => {
    const contents = BrowserWindow.getAllWindows()[0]!.webContents
    contents.sendInputEvent({ type: 'keyDown', keyCode: code, modifiers: ['control'] })
    contents.sendInputEvent({ type: 'keyUp', keyCode: code, modifiers: ['control'] })
  }, keyCode)
  await settle(await app.firstWindow())
}

test('copier, couper et coller des pièces au clavier', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  const pieces = page.getByTestId('viewport')

  // Copier le fond, puis le coller deux fois : les copies ne chevauchent rien
  await cutRows(page).nth(2).click()
  await page.getByTestId('cut-list').locator('tr[data-selected="true"] button').focus()
  await pressCtrl(app, 'C')
  await pressCtrl(app, 'V')
  await expect(pieces).toHaveAttribute('data-piece-count', '9')
  await pressCtrl(app, 'V')
  await expect(pieces).toHaveAttribute('data-piece-count', '10')
  await expect(cutRows(page).nth(2)).toHaveText(/^3\s*Fond, Fond \(copie\)\s*1800\s*800\s*5/)
  await expect(page.getByTestId('overlap-warning')).toHaveCount(0)

  // La copie collée devient la sélection, et une seule action suffit à l'annuler
  await expect(field(page, 'Nom')).toHaveValue('Fond (copie)')
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await expect(pieces).toHaveAttribute('data-piece-count', '9')

  // Couper : la pièce disparaît, et se recolle ensuite
  await cutRows(page).nth(0).click()
  await page.getByTestId('cut-list').locator('tr[data-selected="true"] button').focus()
  await expect(page.getByText('2 pièces sélectionnées')).toBeVisible()
  await pressCtrl(app, 'X')
  await expect(pieces).toHaveAttribute('data-piece-count', '7')
  await pressCtrl(app, 'V')
  await expect(pieces).toHaveAttribute('data-piece-count', '9')
  await expect(page.getByText('2 pièces sélectionnées')).toBeVisible()

  await app.close()
})

test('copier-coller depuis le menu, et vers un nouveau projet', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await cutRows(page).nth(2).click()
  await clickMenu(app, 'Copier')
  await clickMenu(app, 'Nouveau')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Ne pas enregistrer' }).click()
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '0')

  await clickMenu(app, 'Coller')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '1')
  await expect(cutRows(page).nth(0)).toHaveText(/^1\s*Fond \(copie\)\s*1800\s*800\s*5/)
  await app.close()
})

test('dans un champ, copier et coller restent du texte', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)

  // Des pièces sont au presse-papiers du logiciel : elles ne doivent pas arriver pendant une saisie
  await cutRows(page).nth(2).click()
  await page.getByTestId('cut-list').locator('tr[data-selected="true"] button').focus()
  await pressCtrl(app, 'C')

  const name = field(page, 'Nom')
  await name.fill('Dos du meuble')
  await name.focus()
  await pressCtrl(app, 'A')
  await pressCtrl(app, 'C')
  expect(await app.evaluate(({ clipboard }) => clipboard.readText())).toBe('Dos du meuble')

  const material = field(page, 'Matériau')
  await material.focus()
  await pressCtrl(app, 'V')
  await expect(material).toHaveValue('Dos du meuble')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')

  // Le menu suit la même règle
  await material.fill('')
  await clickMenu(app, 'Coller')
  await expect(material).toHaveValue('Dos du meuble')
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')

  await app.close()
})

test('une boîte de dialogue ouverte bloque les raccourcis', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)
  await cutRows(page).nth(2).click()
  await page.getByTestId('cut-list').locator('tr[data-selected="true"] button').focus()
  await pressCtrl(app, 'C')

  await clickMenu(app, 'Nouveau')
  await expect(page.getByRole('alertdialog')).toBeVisible()

  // Une vérification après chaque action : l'une pourrait défaire ce qu'une autre a fait.
  const expectUntouched = async () => {
    await settle(page)
    await expect(page.getByTestId('viewport')).toHaveAttribute('data-piece-count', '8')
    await expect(page.getByRole('alertdialog')).toBeVisible()
  }
  await page.keyboard.press('Delete')
  await expectUntouched()
  await pressCtrl(app, 'V')
  await expectUntouched()
  for (const entry of ['Supprimer', 'Dupliquer', 'Coller', 'Annuler']) {
    await clickMenu(app, entry)
    await expectUntouched()
  }

  await app.close()
})

test('changer les dimensions d\'un caisson retouché demande confirmation', async () => {
  const { app, page } = await launchApp()
  await createCaisson(page)

  // Sans retouche, aucune question
  await commitField(page, 'Largeur', '900')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(cutRows(page).nth(1)).toHaveText(/864/)

  await cutRows(page).nth(2).click()
  await commitField(page, 'Matériau', 'Contreplaqué')
  await page.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByTestId('cut-list')).toContainText('Contreplaqué')

  // Renoncer : rien ne change, et le champ reprend sa valeur
  await commitField(page, 'Largeur', '1000')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Garder mes ajustements' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(field(page, 'Largeur')).toHaveValue('900')
  await expect(page.getByTestId('cut-list')).toContainText('Contreplaqué')

  // Confirmer : le caisson est régénéré, et les retouches disparaissent
  await commitField(page, 'Largeur', '1000')
  await page.getByRole('button', { name: 'Remplacer' }).click()
  await expect(cutRows(page).nth(1)).toHaveText(/964/)
  await expect(page.getByTestId('cut-list')).not.toContainText('Contreplaqué')

  await app.close()
})

test('créer un caisson par-dessus des panneaux demande confirmation', async () => {
  const { app, page } = await launchApp()
  await addPanel(page)
  await page.getByRole('button', { name: 'Fermer' }).click()
  await page.getByRole('button', { name: 'Créer le caisson' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Garder mes ajustements' }).click()
  await expect(cutRows(page)).toHaveCount(1)
  await app.close()
})
