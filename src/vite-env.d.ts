/// <reference types="vite/client" />

interface ElectronAPI {
  saveJson: (data: any, filename: string) => Promise<boolean>
  loadJson: () => Promise<any>
  showSaveDialog: (filename: string) => Promise<string | null>
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
