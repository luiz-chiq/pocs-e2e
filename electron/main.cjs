const { app, BrowserWindow } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const dist = path.join(__dirname, '../dist')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
let server
function startServer() { return new Promise((resolve) => { server = http.createServer((req, res) => { const url = req.url === '/' ? '/index.html' : req.url.split('?')[0]; const file = path.resolve(dist, `.${url}`); if (!file.startsWith(dist)) return res.writeHead(403).end(); fs.readFile(file, (err, data) => { if (err) return res.writeHead(404).end(); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data) }) }).listen(0, '127.0.0.1', () => resolve(server.address().port)) }) }
async function createWindow() { const port = await startServer(); const window = new BrowserWindow({ width: 900, height: 700, webPreferences: { contextIsolation: true, sandbox: true } }); await window.loadURL(`http://127.0.0.1:${port}`) }
app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => server?.close())
