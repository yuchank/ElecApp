const { app, BrowserWindow, dialog, Menu } = require('electron')
const menu = require('./application-menu')
const fs = require('fs')

const windows = new Set()
const openFiles = new Map()

const debug = /--debug/.test(process.argv[2])

app.on('ready', () => {
  Menu.setApplicationMenu(menu)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    return false
  }
  app.quit()
})

app.on('activate', (event, hasVisibleWindows) => {
  if (!hasVisibleWindows) {
    createWindow()
  }
})

app.on('will-finish-launching', () => {
  app.on('open-file', (event, file) => {
    const win = createWindow()
    win.once('ready-to-show', () => {
      openFile(win, file)
    })
  })
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

  win.on('close', (event) => {
    let isEdited

    if (process.platform === 'darwin') {
      isEdited = win.isDocumentEdited()
    }
    else {
      isEdited = win.isEdited
    }

    if (isEdited) {
      event.preventDefault()

      const result = dialog.showMessageBox(win, {
        type: 'warning',
        title: 'Quit with Unsaved Changes?',
        message: 'Your changes will be lost if you do not save.',
        buttons: [
          'Quit Anyway',
          'Cancel'
        ],
        defaultId: 0,
        cancelId: 1
      })

      if (result === 0) {
        win.destroy()
      }
    }
  })

  win.on('closed', () => {
    windows.delete(win)
    stopWatchingFile(win)
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

const openFile = exports.openFile = (win, file) => {
  const content = fs.readFileSync(file).toString()
  app.addRecentDocument(file)
  win.setRepresentedFilename(file)
  win.webContents.send('file-opened', file, content)
  startWatchingFile(win, file)
}

const saveHtml = exports.saveHtml = (win, content) => {
  const file = dialog.showSaveDialog(win, {
    title: 'Save HTML',
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'HTML Files', extensions: ['html', 'htm'] }
    ]
  })

  if (!file) {
    return
  }

  fs.writeFileSync(file, content)
}

const saveMarkdown = exports.saveMarkdown = (win, file, content) => {
  if (!file) {
    file = dialog.showSaveDialog(win, {
      title: 'Save Markdown',
      defaultPath: app.getPath('documents'),
      filters: [
       { name: 'Markdown Files', extensions: ['md', 'markdown'] }
      ]
    })
  }

  if (!file) {
    return
  }

  fs.writeFileSync(file, content)
}

// win32
const setDocumentEdited = exports.setDocumentEdited = (win, isEdited) => {
  win.isEdited = isEdited
}

const startWatchingFile = (win, file) => {
  stopWatchingFile(win)

  const watcher = fs.watchFile(file, () => {
    const content = fs.readFileSync(file).toString()
    win.webContents.send('file-changed', file, content)
  })

  openFiles.set(win, watcher)
}

const stopWatchingFile = (win) => {
  if (openFiles.has(win)) {
    openFiles.get(win).stop()
    openFiles.delete(win)
  }
}


// http://www.adequatelygood.com/JavaScript-Scoping-and-Hoisting.html
