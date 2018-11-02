const { app, BrowserWindow } = require('electron')

const debug = /--debug/.test(process.argv[2])

let win = null

app.on('ready', () => {
  win = new BrowserWindow()
  win.webContents.loadFile('./app/index.html')

  if (debug) {
    win.webContents.openDevTools()
  }
})