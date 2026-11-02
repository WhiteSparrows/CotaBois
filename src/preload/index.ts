import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { FileResult } from '../main/files'
import type { MenuCommand } from '../main/menu'

function subscribe<T extends unknown[]>(channel: string, callback: (...args: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, ...args: T) => callback(...args)
  ipcRenderer.on(channel, listener as (event: IpcRendererEvent, ...args: unknown[]) => void)
  return () => ipcRenderer.removeListener(channel, listener as (event: IpcRendererEvent, ...args: unknown[]) => void)
}

const api = {
  onMenuCommand: (callback: (command: MenuCommand) => void) => subscribe('menu:command', callback),
  onCloseRequested: (callback: () => void) => subscribe('window:close-requested', callback),

  openProject: (): Promise<FileResult<{ text: string }>> => ipcRenderer.invoke('file:open'),
  projectOpened: (): Promise<void> => ipcRenderer.invoke('file:opened'),
  saveProject: (text: string, suggestedName: string): Promise<FileResult<{ fileName: string }>> =>
    ipcRenderer.invoke('file:save', text, suggestedName),
  saveProjectAs: (text: string, suggestedName: string): Promise<FileResult<{ fileName: string }>> =>
    ipcRenderer.invoke('file:save-as', text, suggestedName),
  newProject: (): Promise<void> => ipcRenderer.invoke('file:new'),

  setDirty: (isDirty: boolean): void => ipcRenderer.send('window:set-dirty', isDirty),
  confirmClose: (): void => ipcRenderer.send('window:confirm-close')
}

export type CotaboisApi = typeof api

contextBridge.exposeInMainWorld('cotabois', api)
