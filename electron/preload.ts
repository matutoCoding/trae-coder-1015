import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveJson: (filePath: string, data: unknown) => 
    ipcRenderer.invoke('save-json', filePath, data),
  loadJson: (filePath: string) => 
    ipcRenderer.invoke('load-json', filePath),
  showSaveDialog: (options: Electron.SaveDialogOptions) => 
    ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) => 
    ipcRenderer.invoke('show-open-dialog', options),
  getAppPath: () => ipcRenderer.invoke('get-app-path')
})

export type ElectronAPI = {
  saveJson: (filePath: string, data: unknown) => Promise<{ success: boolean; error?: string }>
  loadJson: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
  getAppPath: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
