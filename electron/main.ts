import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: '发条动力储备分析系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('save-json', async (_event: Electron.IpcMainInvokeEvent, filePath: string, data: unknown) => {
  void _event
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('load-json', async (_event: Electron.IpcMainInvokeEvent, filePath: string) => {
  void _event
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { success: true, data: JSON.parse(content) }
    }
    return { success: false, error: '文件不存在' }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('show-save-dialog', async (_event: Electron.IpcMainInvokeEvent, options: Electron.SaveDialogOptions) => {
  void _event
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result
})

ipcMain.handle('show-open-dialog', async (_event: Electron.IpcMainInvokeEvent, options: Electron.OpenDialogOptions) => {
  void _event
  const result = await dialog.showOpenDialog(mainWindow!, options)
  return result
})

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData')
})
