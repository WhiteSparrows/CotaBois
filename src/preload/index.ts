import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { MenuCommand } from '../main/menu'

const api = {
  onMenuCommand(callback: (command: MenuCommand) => void): () => void {
    const listener = (_event: IpcRendererEvent, command: MenuCommand) => callback(command)
    ipcRenderer.on('menu:command', listener)
    return () => ipcRenderer.removeListener('menu:command', listener)
  }
}

export type CotaboisApi = typeof api

contextBridge.exposeInMainWorld('cotabois', api)
