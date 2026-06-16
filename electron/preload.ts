import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveJson: (filePath: string, data: unknown) =>
    ipcRenderer.invoke('save-json', filePath, data),
  loadJson: (filePath: string) =>
    ipcRenderer.invoke('load-json', filePath),
  showSaveDialog: (defaultFilename: string) =>
    ipcRenderer.invoke('show-save-dialog', defaultFilename),
  showOpenDialog: () =>
    ipcRenderer.invoke('show-open-dialog'),
  getAppPath: () => ipcRenderer.invoke('get-app-path')
})

export type ElectronAPI = {
  saveJson: (filePath: string, data: unknown) => Promise<{ success: boolean; error?: string }>
  loadJson: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  showSaveDialog: (defaultFilename: string) => Promise<string | null>
  showOpenDialog: () => Promise<string | null>
  getAppPath: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
