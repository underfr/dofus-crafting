'use strict'

const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path  = require('path')
const fs    = require('fs')
const http  = require('http')
const { loadBundle } = require('./bundle')

const IS_PACKAGED  = app.isPackaged
const RESOURCES    = IS_PACKAGED ? process.resourcesPath : path.join(__dirname, '..')
const DATA_DIR     = path.join(RESOURCES, 'data')
const JOB_ICONS_DIR = path.join(__dirname, 'renderer', 'assets', 'jobs')
const BUNDLE_PATH  = path.join(DATA_DIR, 'data.dcft')
const QUEUE_PATH   = path.join(app.getPath('userData'), 'queue.json')
const PRICES_PATH  = path.join(app.getPath('userData'), 'prices.json')

let bundleData     = null   // { meta, iconMap }
let iconServerPort = 0

// ── Bundle loading ──────────────────────────────────────────────────────────
function tryLoadBundle() {
  if (!fs.existsSync(BUNDLE_PATH)) return false
  try {
    bundleData = loadBundle(BUNDLE_PATH)
    return true
  } catch (e) {
    console.error('Bundle load error:', e.message)
    return false
  }
}

// ── Icon HTTP server ────────────────────────────────────────────────────────
function startIconServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const send = (data) => {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' })
        res.end(data)
      }
      const notFound = () => { res.writeHead(404); res.end() }

      if (req.url.startsWith('/job/')) {
        // Job icons always served from assets (small, static)
        const id = req.url.replace('/job/', '').replace(/[^0-9]/g, '')
        fs.readFile(path.join(JOB_ICONS_DIR, `${id}.png`), (err, data) => {
          err ? notFound() : send(data)
        })
        return
      }

      const iconId = parseInt(req.url.replace(/^\/+/, '').replace(/[^0-9]/g, ''), 10)

      if (bundleData) {
        // Serve from in-memory bundle
        const data = bundleData.iconMap.get(iconId)
        data ? send(data) : notFound()
      } else {
        // Fallback: serve from disk
        fs.readFile(path.join(DATA_DIR, 'icons', `${iconId}.png`), (err, data) => {
          err ? notFound() : send(data)
        })
      }
    })

    server.listen(0, '127.0.0.1', () => {
      iconServerPort = server.address().port
      resolve(iconServerPort)
    })
    app.on('before-quit', () => server.close())
  })
}

// ── Window ──────────────────────────────────────────────────────────────────
async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Dofus Craft',
    backgroundColor: '#050300',
  })
  win.once('ready-to-show', () => win.show())
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

// ── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  tryLoadBundle()
  await startIconServer()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC : icon port ─────────────────────────────────────────────────────────
ipcMain.handle('get-icon-port', () => iconServerPort)

// ── IPC : available languages ────────────────────────────────────────────────
ipcMain.handle('get-languages', () => {
  if (bundleData) return Object.keys(bundleData.metas)
  return ['fr']
})

// ── IPC : load data ─────────────────────────────────────────────────────────
ipcMain.handle('load-data', (_, lang = 'fr') => {
  // From bundle
  if (bundleData) {
    return bundleData.metas[lang] || bundleData.metas['fr'] || Object.values(bundleData.metas)[0]
  }

  // Fallback: read JSON files individually (dev mode, FR only)
  const result = {}
  for (const name of ['items', 'recipes', 'jobs', 'item_types']) {
    const filePath = path.join(DATA_DIR, `${name}.json`)
    if (!fs.existsSync(filePath)) {
      return { error: `Fichier ${name}.json introuvable. Lance l'extraction d'abord.` }
    }
    result[name] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }
  const extraPath = path.join(DATA_DIR, 'items_extra.json')
  result.items_extra = fs.existsSync(extraPath)
    ? JSON.parse(fs.readFileSync(extraPath, 'utf-8'))
    : {}
  return result
})

// ── IPC : craft queue persistence ───────────────────────────────────────────
ipcMain.handle('load-queue', () => {
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'))
  } catch {
    return []
  }
})

ipcMain.handle('save-queue', (_, queue) => {
  try {
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue), 'utf-8')
  } catch (e) {
    console.error('save-queue error:', e)
  }
})

// ── IPC : prices persistence ────────────────────────────────────────────────
ipcMain.handle('load-prices', () => {
  try {
    return JSON.parse(fs.readFileSync(PRICES_PATH, 'utf-8'))
  } catch {
    return {}
  }
})

ipcMain.handle('save-prices', (_, prices) => {
  try {
    fs.writeFileSync(PRICES_PATH, JSON.stringify(prices), 'utf-8')
  } catch (e) {
    console.error('save-prices error:', e)
  }
})
