import { app, dialog, ipcMain, type BrowserWindow } from 'electron'
import { basename, join } from 'node:path'
import { writeFileAtomic } from './atomicWrite'
import { saveErrorMessage, type FileResult } from './files'

const MARGIN_INCHES = 15 / 25.4

const FOOTER_TEMPLATE = `
  <div style="width: 100%; font-family: 'Segoe UI', sans-serif; font-size: 9px; text-align: center; color: #000;">
    Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
  </div>`

/** Imprime la vue de rapport, que l'interface affiche pour le temps de cette opération. */
export function registerPdfHandler(window: BrowserWindow): void {
  ipcMain.handle(
    'file:export-pdf',
    async (_event, suggestedName: string): Promise<FileResult<{ fileName: string }>> => {
      const { canceled, filePath } = await dialog.showSaveDialog(window, {
        title: 'Exporter la liste de découpe en PDF',
        defaultPath: join(app.getPath('documents'), `${suggestedName}.pdf`),
        filters: [{ name: 'Document PDF', extensions: ['pdf'] }]
      })
      if (canceled || !filePath) return { status: 'canceled' }

      try {
        const pdf = await window.webContents.printToPDF({
          pageSize: 'A4',
          landscape: false,
          // Sans fond : la couleur de la fenêtre ne doit pas teinter les marges du document imprimé.
          printBackground: false,
          margins: { top: MARGIN_INCHES, bottom: MARGIN_INCHES, left: MARGIN_INCHES, right: MARGIN_INCHES },
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate: FOOTER_TEMPLATE
        })
        await writeFileAtomic(filePath, pdf)
        return { status: 'ok', fileName: basename(filePath) }
      } catch (error) {
        return { status: 'error', message: saveErrorMessage(error, 'Le fichier') }
      }
    }
  )
}
