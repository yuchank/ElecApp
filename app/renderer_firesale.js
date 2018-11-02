const { remote, ipcRenderer } = require('electron')
const mp = remote.require('./main')
const win = remote.getCurrentWindow()

const marked = require('marked')

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

const renderMarkdownToHtml = (markdown) => {
  htmlView.innerHTML = marked(markdown, { sanitize: true })
}

markdownView.addEventListener('keyup', (event) => {
  const content = event.target.value
  renderMarkdownToHtml(content)
})

newFileButton.addEventListener('click', () => {
  mp.createWindow()
})

openFileButton.addEventListener('click', () => {
  mp.getFileFromUser(win)
})

ipcRenderer.on('file-opened', (event, file, content) => {
  markdownView.value = content
  renderMarkdownToHtml(content)
})