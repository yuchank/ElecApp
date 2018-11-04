const { remote, ipcRenderer, shell } = require('electron')
const { Menu } = remote

const path = require('path')

const mp = remote.require('./main')
const win = remote.getCurrentWindow()

const marked = require('marked')

let filePath = null
let originalContent = ''

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

const getDraggedFile = (event) => event.dataTransfer.items[0]
const getDroppedFile = (event) => event.dataTransfer.files[0]

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

const renderMarkdownToHtml = (markdown) => {
  htmlView.innerHTML = marked(markdown, { sanitize: true })
}

const showFile = () => {
  if (!filePath) {
    return alert('This file has not been saved to the filesystem.')
  }
  shell.showItemInFolder(filePath)
}

const openInDefaultApplication = () => {
  if (!filePath) {
    return alert('This file has not been saved to the filesystem.')
  }
  shell.openItem(filePath)
}

markdownView.addEventListener('keyup', (event) => {
  const content = event.target.value
  renderMarkdownToHtml(content)
  updateUserInterface(content !== originalContent)
})

markdownView.addEventListener('dragover', (event) => {
  const file = getDraggedFile(event)
  if (fileTypeIsSupported(file)) {
    markdownView.classList.add('drag-over')
  }
  else {
    markdownView.classList.add('drag-error')
  }
})

markdownView.addEventListener('dragleave', (event) => {
  markdownView.classList.remove('drag-over');
  markdownView.classList.remove('drag-error');
})

markdownView.addEventListener('drop', (event) => {
  const file = getDroppedFile(event)

  if (fileTypeIsSupported(file)) {
    mp.openFile(win, file.path)
  }
  else {
    alert('That file type is not supported')
  }

  markdownView.classList.remove('drag-over');
  markdownView.classList.remove('drag-error');
})

markdownView.addEventListener('contextmenu', (event) => {
  event.preventDefault()
  createContextMenu().popup(win)
})

newFileButton.addEventListener('click', () => {
  mp.createWindow()
})

openFileButton.addEventListener('click', () => {
  mp.getFileFromUser(win)
})

saveHtmlButton.addEventListener('click', () => {
  mp.saveHtml(win, htmlView.innerHTML)
})

saveMarkdownButton.addEventListener('click', () => {
  mp.saveMarkdown(win, filePath, markdownView.value)
})

revertButton.addEventListener('click', () => {
  markdownView.value = originalContent
  renderMarkdownToHtml(originalContent)
})

showFileButton.addEventListener('click', showFile)
openInDefaultButton.addEventListener('click', openInDefaultApplication)

ipcRenderer.on('file-opened', (event, file, content) => {
  if (win.isDocumentEdited()) {
    const result = remote.dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Overwrite Current Unsaved Changes?',
      message: 'Opening a new file in this window will overwrite your unsaved changes. Open this file anyway?',
      buttons: [
        'Yes',
        'Cancel'
      ],
      defaultId: 0,
      cancelId: 1
    })

    if (result === 1) {
      return
    }
  }
  renderFile(file, content)
})

ipcRenderer.on('file-changed', (event, file, content) => {
  const result = remote.dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Overwrite Current Unsaved Changes?',
    message: 'Another application has changed this file. Load changes?',
    buttons: [
      'Yes',
      'Cancel'
    ],
    defaultId: 0,
    cancelId: 1
  })
  renderFile(file, content)
})

ipcRenderer.on('save-markdown', () => {
  mp.saveMarkdown(win, filePath, markdownView.value)
})

ipcRenderer.on('save-html', () => {
  mp.saveHtml(win, filePath, markdownView.value)
})

ipcRenderer.on('show-file', showFile)
ipcRenderer.on('open-in-default', openInDefaultApplication)

const updateUserInterface = (isEdited) => {
  let title = 'Fire Sale'
  if (filePath) {
    title = `${path.basename(filePath)} - ${title}`
  }
  if (isEdited) {
    title = `${title} (Edited)`
  }
  win.setTitle(title)
  win.setDocumentEdited(isEdited)

  if (process.platform === 'win32')  {
    mp.setDocumentEdited(win, isEdited)
  }
  
  saveMarkdownButton.disabled = !isEdited
  revertButton.disabled = !isEdited
}

const fileTypeIsSupported = (file) => {
  return ['text/plain', 'text/markdown', ''].includes(file.type)
}

const renderFile = (file, content) => {
  filePath = file
  originalContent = content
  
  markdownView.value = content
  renderMarkdownToHtml(content)

  showFileButton.disabled = false
  openInDefaultButton.disabled = false
  
  updateUserInterface(false)
}

const createContextMenu = () => {
  return Menu.buildFromTemplate([
    { 
      label: 'Open File', 
      click() { 
        mp.getFileFromUser()
      } 
    },
    {
      label: 'Show File in Folder',
      click: showFile,
      enabled: !!filePath
    },
    {
      label: 'Open in Default Editor',
      click: openInDefaultApplication,
      enabled: !!filePath
    },
    { type: 'separator' },
    { 
      label: 'Cut', 
      role: 'cut' 
    },
    { 
      label: 'Copy', 
      role: 'copy' 
    },
    { 
      label: 'Paste', 
      role: 'paste' 
    },
    { 
      label: 'Select All', 
      role: 'selectall' 
    }
  ])
}