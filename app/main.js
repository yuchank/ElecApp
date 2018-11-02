const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')

const windows = new Set()

const debug = /--debug/.test(process.argv[2])

app.on('ready', () => {
  createWindow()
})

const createWindow = exports.createWindow = () => {
  let x, y
  
  const old = BrowserWindow.getFocusedWindow()

  if (old) {
    const [ oldx, oldy ] = old.getPosition()
    x = oldx + 10
    y = oldy + 10
  }

  let win = new BrowserWindow({ x, y, show: false })

  win.loadURL(`file://${__dirname}/firesale.html`)

  win.once('ready-to-show', () => {
    win.show()
  });

  win.on('closed', () => {
    windows.delete(win)
    win = null;
  })

  windows.add(win)
  return win
}

const getFileFromUser = exports.getFileFromUser = (win) => {
  const files = dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] }
    ]
  })
  
  if (files) {
    openFile(win, files[0])
  }
}

const openFile = (win, file) => {
  const content = fs.readFileSync(file).toString()
  win.webContents.send('file-opened', file, content)
}

// http://www.adequatelygood.com/JavaScript-Scoping-and-Hoisting.html