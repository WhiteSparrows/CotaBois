import { randomUUID } from 'node:crypto'
import { rename, rm, writeFile } from 'node:fs/promises'

/** Écrit d'abord à côté de la cible : un disque plein ou une erreur ne peut pas abîmer le fichier existant. */
export async function writeFileAtomic(path: string, content: string): Promise<void> {
  const temporaryPath = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, content, 'utf8')
    await rename(temporaryPath, path)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    throw error
  }
}
