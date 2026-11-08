import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeFileAtomic } from '../../src/main/atomicWrite'

describe('writeFileAtomic', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cotabois-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('crée le fichier, en UTF-8', async () => {
    const path = join(dir, 'projet.cotabois')
    await writeFileAtomic(path, 'Étagère « haute »')
    expect(readFileSync(path, 'utf8')).toBe('Étagère « haute »')
  })

  it('remplace un fichier existant, sans laisser de fichier temporaire', async () => {
    const path = join(dir, 'projet.cotabois')
    writeFileSync(path, 'ancien')
    await writeFileAtomic(path, 'nouveau')
    expect(readFileSync(path, 'utf8')).toBe('nouveau')
    expect(readdirSync(dir)).toEqual(['projet.cotabois'])
  })

  it("laisse la cible intacte et nettoie le fichier temporaire quand l'écriture échoue", async () => {
    // Un dossier à la place du fichier : le renommage final échoue.
    const path = join(dir, 'occupe')
    mkdirSync(path)
    writeFileSync(join(path, 'garde.txt'), 'intact')
    await expect(writeFileAtomic(path, 'nouveau')).rejects.toThrow()
    expect(readdirSync(dir)).toEqual(['occupe'])
    expect(readFileSync(join(path, 'garde.txt'), 'utf8')).toBe('intact')
  })

  it('échoue dans un dossier inexistant', async () => {
    await expect(writeFileAtomic(join(dir, 'absent', 'projet.cotabois'), 'x')).rejects.toThrow()
  })
})
