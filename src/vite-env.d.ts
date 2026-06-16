/// <reference types="vite/client" />

interface ElectronAPI {
  saveJson: (filePath: string, data: unknown) => Promise<{ success: boolean; error?: string }>
  loadJson: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  showSaveDialog: (defaultFilename: string) => Promise<string | null>
  showOpenDialog: () => Promise<string | null>
  getAppPath: () => Promise<string>
}

interface Window {
  electronAPI: ElectronAPI
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.json' {
  const value: any
  export default value
}
