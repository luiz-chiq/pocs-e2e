const { app, BrowserWindow, net, protocol, ipcMain, dialog } = require('electron')
const { registerPolygonFiles } = require('./polygon-files.cjs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

// A origem estável preserva IndexedDB e comunicação entre janelas ao reiniciar.
const origin = 'poligonos://app'
const dist = path.join(__dirname, '../dist')
protocol.registerSchemesAsPrivileged([{
  scheme: 'poligonos',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true }
}])

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    useContentSize: true,
    icon: path.join(__dirname, '../public/icons/pwa-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') }
  })
  return window.loadURL(`${origin}/`)
}

app.whenReady().then(() => {
  registerPolygonFiles({ ipcMain, BrowserWindow, dialog, origin })
  protocol.handle('poligonos', (request) => {
    const url = new URL(request.url)
    if (url.host !== 'app') return new Response('Not found', { status: 404 })
    let pathname
    try { pathname = decodeURIComponent(url.pathname) } catch { return new Response('Invalid path', { status: 400 }) }
    const file = path.resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`)
    const relative = path.relative(dist, file)
    if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 })
    return net.fetch(pathToFileURL(file).href)
  })
  return createWindow()
}).catch((error) => {
  console.error('Não foi possível iniciar o aplicativo:', error)
  app.exit(1)
})
app.on('window-all-closed', () => app.quit())

app.on('web-contents-created', (_event, contents) => {
  const trusted = (value) => {
    try {
      const url = new URL(value)
      return `${url.protocol}//${url.host}` === origin && (url.pathname === '/' || url.pathname === '/index.html')
    } catch { return false }
  }
  contents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault() })
  contents.setWindowOpenHandler(({ url }) => trusted(url)
    ? { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false } } }
    : { action: 'deny' })
})
