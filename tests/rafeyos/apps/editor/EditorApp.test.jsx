// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  desktopIcon,
  fsDisk,
  fsFiles,
  fsStoreOn,
  fsTrash,
  rightClick,
  headerTitle,
  memoryStorage,
  menuEntry,
  menuLabels,
  openTerminal,
  quotaError,
  refusingWrites,
  renderDesktop,
  runFsOp,
  typeCommand,
  windowsOf,
} from '@/tests/rafeyos/helpers/renderRafeyOS'
import { mkdir, remove, writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { realContent, realVfs } from '@/tests/rafeyos/helpers/testVfs'
import { textDocuments } from '@/components/rafeyos/core/vfs/queries'
import { trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { documentLabel } from '@/components/rafeyos/apps/editor/logic/editorMenus'
import { FS_KEY } from '@/components/rafeyos/core/vfs/fsStore'

afterEach(cleanup)

const openBio = () => {
  const view = renderDesktop()
  clickDock('Terminal')
  const input = within(windowsOf(view.container, 'terminal')[0]).getByLabelText('Terminal input')
  fireEvent.change(input, { target: { value: 'xdg-open bio.txt' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  const [win] = windowsOf(view.container, 'editor')
  return { ...view, win, ui: within(win) }
}

const openUntitled = (overrides) => {
  const view = renderDesktop(overrides)
  clickDock('Text Editor')
  const [win] = windowsOf(view.container, 'editor')
  return { ...view, win, ui: within(win) }
}

const field = (ui, name) => ui.getByLabelText(name)

const folderButton = (dialog) => dialog.getByRole('button', { name: /^Folder / })

/** `folder` is the label the dropdown shows: Home, Desktop or Documents. */
const saveAs = (ui, name, folder) => {
  fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
  chooseMenuItem('Save')
  const dialog = within(ui.getByRole('dialog', { name: 'Save' }))
  fireEvent.change(dialog.getByLabelText('File name'), { target: { value: name } })
  if (folder) {
    fireEvent.click(folderButton(dialog))
    chooseMenuItem(folder)
  }
  fireEvent.click(dialog.getByRole('button', { name: 'Save' }))
}

const openSaveDialog = (ui) => {
  fireEvent.change(field(ui, 'Untitled'), { target: { value: 'x' } })
  fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
  chooseMenuItem('Save')
  return within(ui.getByRole('dialog', { name: 'Save' }))
}

describe('Text Editor', () => {
  it('opens a shipped file locked, at a readable size', () => {
    const { win, ui } = openBio()
    const text = field(ui, 'bio.txt')

    expect(text.value).toBe(realContent.bio)
    expect(text.readOnly).toBe(true)
    expect(text.className).toBe('')
    expect(headerTitle(win)).toBe('bio.txt')
    expect(win.querySelector('.hb .ttl small').textContent).toBe('Read Only')
    expect(win.getAttribute('aria-label')).toBe('bio.txt')

    fireEvent.change(text, { target: { value: 'edited' } })
    expect(text.value).toBe(realContent.bio)
    expect(headerTitle(win)).toBe('bio.txt')
  })

  it('keeps one window per file', () => {
    const { container } = openBio()

    const input = within(windowsOf(container, 'terminal')[0]).getByLabelText('Terminal input')
    fireEvent.change(input, { target: { value: 'xdg-open bio.txt' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(windowsOf(container, 'editor')).toHaveLength(1)
  })

  it('lists every text document under Open and opens the one picked', () => {
    const { container, ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: /^Open/ }))

    expect(screen.getByText('Recent Documents')).toBeTruthy()
    expect(menuLabels()).toEqual(textDocuments(realVfs).map((path) => documentLabel(realVfs, path)))
    chooseMenuItem(/^README\.txt\s+\/home\/rafey$/)
    const readme = windowsOf(container, 'editor')[1]
    const text = within(readme).getByLabelText('README.txt')
    expect(readme.getAttribute('aria-label')).toBe('README.txt')
    expect(text.className).toBe('')
    expect(text.readOnly).toBe(true)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('shows its file in Files, selected', () => {
    const { container, ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Show in Files')

    const [files] = windowsOf(container, 'files')
    expect(files.getAttribute('aria-label')).toBe('rafey')
    expect(files.querySelector('.fbody [data-path="/home/rafey/bio.txt"]').className).toContain('sel')
  })

  it("opens a terminal in its file's folder", () => {
    const { container, ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Open in Terminal')

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey.ai: /home/rafey')
  })

  it('keeps Save off for a shipped file and uses New to open a blank page', () => {
    const { container, ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))

    expect(menuLabels()).toEqual(['Show in Files', 'Open in Terminal', 'Save', 'Preferences', 'About Text Editor'])
    ;['Save', 'Preferences', 'About Text Editor'].forEach((name) => expect(menuEntry(name).disabled).toBe(true))

    fireEvent.click(ui.getByRole('button', { name: 'New tab' }))

    const untitled = windowsOf(container, 'editor')[1]
    expect(untitled.getAttribute('aria-label')).toBe('Untitled')
    expect(within(untitled).getByLabelText('Untitled').value).toBe('')
  })

  it('opens a blank page from the dock', () => {
    const { win, ui } = openUntitled()
    const text = field(ui, 'Untitled')

    expect(win.getAttribute('aria-label')).toBe('Untitled')
    expect(headerTitle(win)).toBe('Untitled')
    expect(text.readOnly).toBe(false)
    expect(text.value).toBe('')
    expect(win.querySelector('.hb .ttl small')).toBeNull()
  })

  it('saves a named file into Documents, where Files and cat can read it', () => {
    const disk = memoryStorage()
    const { container, ui } = openUntitled({ fs: fsStoreOn(disk) })

    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'hello\n' } })
    saveAs(ui, 'notes')

    expect(ui.getByLabelText('notes.txt').value).toBe('hello\n')
    expect(headerTitle(windowsOf(container, 'editor')[0])).toBe('notes.txt')
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Documents/notes.txt': 'hello\n' })
    expect(fsTrash(disk)).toEqual({})

    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Documents'))
    expect(files.querySelector('[data-path="/home/visitor/Documents/notes.txt"]')).toBeTruthy()

    clickDock('Terminal')
    const terminal = windowsOf(container, 'terminal')[0]
    const input = within(terminal).getByLabelText('Terminal input')
    fireEvent.change(input, { target: { value: 'cat ~/Documents/notes.txt' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(terminal.querySelector('.tlog').textContent).toContain('hello')
  })

  it('reopens a saved file after a refresh and edits it in place', () => {
    const disk = memoryStorage()
    const first = openUntitled({ fs: fsStoreOn(disk) })
    fireEvent.change(field(first.ui, 'Untitled'), { target: { value: 'hello\n' } })
    saveAs(first.ui, 'notes')
    first.unmount()

    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Documents'))
    fireEvent.doubleClick(files.querySelector('[data-path="/home/visitor/Documents/notes.txt"]'))

    const editor = windowsOf(container, 'editor')[0]
    const text = within(editor).getByLabelText('notes.txt')
    expect(text.readOnly).toBe(false)
    expect(text.value).toBe('hello\n')

    fireEvent.change(text, { target: { value: 'hello again\n' } })
    expect(headerTitle(editor)).toBe('• notes.txt')
    fireEvent.click(within(editor).getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Save')
    expect(headerTitle(editor)).toBe('notes.txt')
    expect(fsFiles(disk)['/home/visitor/Documents/notes.txt']).toBe('hello again\n')
  })

  it('asks before replacing a file, and refuses when that file is already open', () => {
    const { container, ui } = openUntitled()
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'one\n' } })
    saveAs(ui, 'notes')
    fireEvent.click(ui.getByRole('button', { name: 'New tab' }))

    const untitled = windowsOf(container, 'editor')[1]
    const second = within(untitled)
    fireEvent.change(field(second, 'Untitled'), { target: { value: 'two\n' } })
    fireEvent.click(second.getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Save')
    fireEvent.change(within(second.getByRole('dialog', { name: 'Save' })).getByLabelText('File name'), { target: { value: 'notes' } })
    fireEvent.click(within(second.getByRole('dialog', { name: 'Save' })).getByRole('button', { name: 'Save' }))

    expect(second.getByRole('dialog', { name: 'Already open' }).textContent).toContain('notes.txt is already open')
    fireEvent.click(second.getByRole('button', { name: 'OK' }))
    fireEvent.click(ui.getByRole('button', { name: 'Close' }))

    fireEvent.click(second.getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Save')
    fireEvent.change(within(second.getByRole('dialog', { name: 'Save' })).getByLabelText('File name'), { target: { value: 'notes' } })
    fireEvent.click(within(second.getByRole('dialog', { name: 'Save' })).getByRole('button', { name: 'Save' }))
    const replace = within(second.getByRole('dialog', { name: 'Replace file' }))
    expect(replace.getByRole('heading', { name: 'Replace notes.txt?' })).toBeTruthy()
    fireEvent.click(replace.getByRole('button', { name: 'Replace' }))

    expect(field(second, 'notes.txt').value).toBe('two\n')
  })

  it('asks before closing a dirty page, and discard throws the text away', () => {
    const { container, win, ui } = openUntitled()
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'keep me' } })

    fireEvent.click(ui.getByRole('button', { name: 'Close' }))
    const dialog = within(ui.getByRole('dialog', { name: 'Save changes' }))
    expect(dialog.getByText('Save changes to Untitled before closing?')).toBeTruthy()
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    expect(windowsOf(container, 'editor')).toEqual([win])
    expect(field(ui, 'Untitled').value).toBe('keep me')

    fireEvent.click(ui.getByRole('button', { name: 'Close' }))
    fireEvent.click(within(ui.getByRole('dialog', { name: 'Save changes' })).getByRole('button', { name: 'Discard' }))
    expect(windowsOf(container, 'editor')).toHaveLength(0)
  })

  it('saves from the close prompt', () => {
    const disk = memoryStorage()
    const { container, ui } = openUntitled({ fs: fsStoreOn(disk) })
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'from close' } })

    fireEvent.click(ui.getByRole('button', { name: 'Close' }))
    fireEvent.click(within(ui.getByRole('dialog', { name: 'Save changes' })).getByRole('button', { name: 'Save' }))
    fireEvent.change(within(ui.getByRole('dialog', { name: 'Save' })).getByLabelText('File name'), { target: { value: 'later' } })
    fireEvent.click(within(ui.getByRole('dialog', { name: 'Save' })).getByRole('button', { name: 'Save' }))

    expect(windowsOf(container, 'editor')).toHaveLength(0)
    expect(fsFiles(disk)['/home/visitor/Documents/later.txt']).toBe('from close')
  })

  it('rejects a bad name and reports a blocked write', () => {
    const blocked = openUntitled({ fs: fsStoreOn(null) })
    fireEvent.change(field(blocked.ui, 'Untitled'), { target: { value: 'hello' } })
    saveAs(blocked.ui, 'a/b')

    expect(blocked.ui.getByRole('dialog', { name: 'Save' }).textContent).toContain('Choose a file name.')
    expect(headerTitle(blocked.win)).toBe('• Untitled')

    fireEvent.change(within(blocked.ui.getByRole('dialog', { name: 'Save' })).getByLabelText('File name'), { target: { value: 'notes' } })
    fireEvent.click(within(blocked.ui.getByRole('dialog', { name: 'Save' })).getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('status').textContent).toContain("Couldn't save")
    expect(screen.getByRole('status').textContent).toContain('This browser blocked saving the file.')
    expect(blocked.ui.getByLabelText('Untitled').value).toBe('hello')
  })

  it('says the storage is full when a save does not fit, keeping the text and the disk as they were', () => {
    const disk = memoryStorage()
    const { win, ui } = openUntitled({ fs: fsStoreOn(refusingWrites(disk, quotaError())) })
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'too big' } })

    saveAs(ui, 'notes')

    expect(screen.getByRole('status').textContent).toContain("Couldn't save")
    expect(screen.getByRole('status').textContent).toContain("This browser's storage is full.")
    expect(headerTitle(win)).toBe('• Untitled')
    expect(ui.getByLabelText('Untitled').value).toBe('too big')
    expect(disk.has(FS_KEY)).toBe(false)
  })

  it('asks which folder a new file goes in from a dropdown, defaulting to Documents', () => {
    const { ui } = openUntitled()
    const dialog = openSaveDialog(ui)

    expect(folderButton(dialog).textContent).toBe('Documents')
    fireEvent.click(folderButton(dialog))
    expect(menuLabels()).toEqual(['Home', 'Desktop', 'Documents'])
    expect(menuEntry('Documents').getAttribute('aria-checked')).toBe('true')
    expect(menuEntry('Desktop').getAttribute('aria-checked')).toBe('false')
    expect(menuEntry('Documents').querySelector('.chk')).toBeTruthy()
    expect(menuEntry('Desktop').querySelector('.chk')).toBeNull()
    expect(menuEntry('Home').querySelector('.mic')).toBeTruthy()

    chooseMenuItem('Desktop')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(folderButton(dialog).textContent).toBe('Desktop')
  })

  it('closes the folder menu on a second click of the dropdown, keeping the dialog', () => {
    const { ui } = openUntitled()
    const dialog = openSaveDialog(ui)

    fireEvent.click(folderButton(dialog))
    fireEvent.click(folderButton(dialog))

    expect(screen.queryByRole('menu')).toBeNull()
    expect(ui.getByRole('dialog', { name: 'Save' })).toBeTruthy()
  })

  it('keeps the folder menu open while the dialog is pressed', () => {
    const { ui } = openUntitled()
    const dialog = openSaveDialog(ui)
    fireEvent.click(folderButton(dialog))

    fireEvent.pointerDown(ui.getByRole('dialog', { name: 'Save' }), { button: 0 })

    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('puts focus back on the dropdown after a folder is picked', () => {
    const { ui } = openUntitled()
    const dialog = openSaveDialog(ui)
    folderButton(dialog).focus()

    fireEvent.click(folderButton(dialog))
    expect(document.activeElement).toBe(menuEntry('Home'))
    chooseMenuItem('Home')

    expect(document.activeElement).toBe(folderButton(dialog))
    expect(folderButton(dialog).textContent).toBe('Home')
  })

  it('closes the folder menu with Escape and keeps the dialog open', () => {
    const { ui } = openUntitled()
    const dialog = openSaveDialog(ui)
    fireEvent.click(folderButton(dialog))

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(ui.getByRole('dialog', { name: 'Save' })).toBeTruthy()
  })

  it('starts the name as Untitled.txt with only Untitled selected', () => {
    const { ui } = openUntitled()
    const name = openSaveDialog(ui).getByLabelText('File name')

    expect(name.value).toBe('Untitled.txt')
    expect(document.activeElement).toBe(name)
    expect([name.selectionStart, name.selectionEnd]).toEqual([0, 8])
  })

  it('saves onto the Desktop when that folder is chosen', () => {
    const { container, ui } = openUntitled()
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'on the desk\n' } })
    saveAs(ui, 'note', 'Desktop')

    expect(ui.getByLabelText('note.txt').value).toBe('on the desk\n')
    expect(desktopIcon(container, '/home/visitor/Desktop/note.txt')).toBeTruthy()
    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Desktop'))
    expect(files.querySelector('[data-path="/home/visitor/Desktop/note.txt"]')).toBeTruthy()
    expect(files.querySelector('[data-path="/home/visitor/Documents/note.txt"]')).toBeNull()
  })

  it('saves a name Rafey uses into the visitor\'s Home, leaving his file alone', () => {
    const disk = memoryStorage()
    const { container, ui } = openUntitled({ fs: fsStoreOn(disk) })
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'mine' } })
    saveAs(ui, 'bio', 'Home')

    expect(ui.queryByRole('dialog', { name: "Can't replace" })).toBeNull()
    expect(fsFiles(disk)).toEqual({ '/home/visitor/bio.txt': 'mine' })
    const { input } = openTerminal(container)
    typeCommand(input, 'cat bio.txt')
    expect(windowsOf(container, 'terminal')[0].querySelector('.tlog').textContent).toContain(realContent.bio.trim().slice(0, 20))
  })

  it('opens a trashed file read-only, with Trash as its folder', () => {
    const disk = fsDisk({}, { '/home/visitor/Desktop/notes.txt': 'gone\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })

    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Trash'))
    fireEvent.doubleClick(files.querySelector(`[data-path="${trashItemPath('/home/visitor/Desktop/notes.txt')}"]`))

    const editor = windowsOf(container, 'editor')[0]
    const text = within(editor).getByLabelText('notes.txt')
    expect(text.readOnly).toBe(true)
    expect(text.value).toBe('gone\n')
    expect(editor.querySelector('.hb .ttl small').textContent).toBe('Trash')
    fireEvent.click(within(editor).getByRole('button', { name: 'Main Menu' }))
    expect(menuEntry('Save').disabled).toBe(true)
  })

  it('closes a clean editor when its file is moved to Trash', () => {
    const disk = memoryStorage()
    const { container, ui } = openUntitled({ fs: fsStoreOn(disk) })
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'hello\n' } })
    saveAs(ui, 'notes')

    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Documents'))
    rightClick(files.querySelector('[data-path="/home/visitor/Documents/notes.txt"]'))
    chooseMenuItem('Move to Trash')

    expect(windowsOf(container, 'editor')).toHaveLength(0)
    expect(fsTrash(disk)['/home/visitor/Documents/notes.txt']).toBe('hello\n')
  })

  it('leaves a dirty file alone when the trash prompt is cancelled', () => {
    const disk = memoryStorage()
    const { container, ui } = openUntitled({ fs: fsStoreOn(disk) })
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'hello\n' } })
    saveAs(ui, 'notes')
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'dirty\n' } })

    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Documents'))
    rightClick(files.querySelector('[data-path="/home/visitor/Documents/notes.txt"]'))
    chooseMenuItem('Move to Trash')
    fireEvent.click(within(ui.getByRole('dialog', { name: 'Save changes' })).getByRole('button', { name: 'Cancel' }))

    expect(windowsOf(container, 'editor')).toHaveLength(1)
    expect(fsFiles(disk)['/home/visitor/Documents/notes.txt']).toBe('hello\n')
    expect(fsTrash(disk)).toEqual({})
  })

  it('trashes the last saved text when dirty changes are discarded', () => {
    const disk = memoryStorage()
    const { container, ui } = openUntitled({ fs: fsStoreOn(disk) })
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'hello\n' } })
    saveAs(ui, 'notes')
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'dirty\n' } })

    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Documents'))
    rightClick(files.querySelector('[data-path="/home/visitor/Documents/notes.txt"]'))
    chooseMenuItem('Move to Trash')
    fireEvent.click(within(ui.getByRole('dialog', { name: 'Save changes' })).getByRole('button', { name: 'Discard' }))

    expect(windowsOf(container, 'editor')).toHaveLength(0)
    expect(fsTrash(disk)['/home/visitor/Documents/notes.txt']).toBe('hello\n')
  })

  it('saves dirty text and then moves the file to Trash', () => {
    const disk = memoryStorage()
    const { container, ui } = openUntitled({ fs: fsStoreOn(disk) })
    fireEvent.change(field(ui, 'Untitled'), { target: { value: 'hello\n' } })
    saveAs(ui, 'notes')
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'dirty\n' } })

    clickDock('Files')
    const files = windowsOf(container, 'files')[0]
    fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Documents'))
    rightClick(files.querySelector('[data-path="/home/visitor/Documents/notes.txt"]'))
    chooseMenuItem('Move to Trash')
    fireEvent.click(within(ui.getByRole('dialog', { name: 'Save changes' })).getByRole('button', { name: 'Save' }))

    expect(windowsOf(container, 'editor')).toHaveLength(0)
    expect(fsTrash(disk)['/home/visitor/Documents/notes.txt']).toBe('dirty\n')
  })
})

const NOTES = '/home/visitor/Desktop/notes.txt'

/** An editor on a file the visitor already has, opened the way they would: a double click on its desktop icon. */
const openDesktopFile = (path = NOTES, text = 'buy milk\n') => {
  const disk = fsDisk({ [path]: text })
  const view = renderDesktop({ fs: fsStoreOn(disk) })
  fireEvent.doubleClick(desktopIcon(view.container, path))
  const [win] = windowsOf(view.container, 'editor')
  return { ...view, disk, win, ui: within(win) }
}

/** An editor on a file the shell made, opened from a Files window. */
const openFromFiles = (container, folder, path) => {
  clickDock('Files')
  const files = windowsOf(container, 'files')[0]
  fireEvent.click(within(within(files).getByRole('navigation', { name: 'Places' })).getByText('Home'))
  const names = folder.split('/').filter(Boolean)
  names.reduce((at, name) => {
    const next = `${at}/${name}`
    fireEvent.doubleClick(files.querySelector(`.fbody [data-path="${next}"]`))
    return next
  }, '/home/visitor')
  fireEvent.doubleClick(files.querySelector(`.fbody [data-path="${path}"]`))
  return windowsOf(container, 'editor')[0]
}

const subtitle = (win) => win.querySelector('.hb .ttl small')?.textContent ?? null

const save = (ui) => {
  fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
  chooseMenuItem('Save')
}

describe('Text Editor when the shell changes its file', () => {
  it('clean editor reloads outside write', () => {
    const { services, win, ui } = openDesktopFile()

    runFsOp(services, writeFile, { path: NOTES, text: 'call Sam\n', append: true })

    expect(field(ui, 'notes.txt').value).toBe('buy milk\ncall Sam\n')
    expect(headerTitle(win)).toBe('notes.txt')
  })

  it('keeps the typing of an edited buffer when the file changes outside', () => {
    const { services, win, ui } = openDesktopFile()
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'buy milk\nbuy eggs\n' } })

    runFsOp(services, writeFile, { path: NOTES, text: 'call Sam\n', append: true })

    expect(field(ui, 'notes.txt').value).toBe('buy milk\nbuy eggs\n')
    expect(headerTitle(win)).toBe('• notes.txt')
  })

  it('clean editor closes when its file is deleted', () => {
    const { container, services } = openDesktopFile()

    runFsOp(services, remove, { path: NOTES })

    expect(windowsOf(container, 'editor')).toHaveLength(0)
  })

  it('dirty editor keeps text shows deleted and saves via prompt', () => {
    const { container, disk, services, win, ui } = openDesktopFile()
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'buy milk\nbuy eggs\n' } })

    runFsOp(services, remove, { path: NOTES })

    expect(windowsOf(container, 'editor')).toEqual([win])
    expect(field(ui, 'notes.txt').value).toBe('buy milk\nbuy eggs\n')
    expect(field(ui, 'notes.txt').readOnly).toBe(false)
    expect(headerTitle(win)).toBe('• notes.txt')
    expect(subtitle(win)).toBe('Deleted')
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'buy milk\n' } })
    expect(windowsOf(container, 'editor')).toEqual([win])
    expect(headerTitle(win)).toBe('• notes.txt')
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'buy milk\nbuy eggs\nbread\n' } })
    expect(field(ui, 'notes.txt').value).toBe('buy milk\nbuy eggs\nbread\n')

    fireEvent.click(ui.getByRole('button', { name: 'Close' }))
    fireEvent.click(within(ui.getByRole('dialog', { name: 'Save changes' })).getByRole('button', { name: 'Cancel' }))
    save(ui)
    const dialog = within(ui.getByRole('dialog', { name: 'Save' }))
    expect(dialog.getByLabelText('File name').value).toBe('notes.txt')
    expect(folderButton(dialog).textContent).toBe('Desktop')
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(fsFiles(disk)[NOTES]).toBe('buy milk\nbuy eggs\nbread\n')
    expect(headerTitle(win)).toBe('notes.txt')
    expect(subtitle(win)).toBe('~/Desktop/')
  })

  it('offers Documents when a deleted file\'s folder is not one Save can use', () => {
    const { container, services } = renderDesktop()
    runFsOp(services, mkdir, { path: '/home/visitor/Desktop/notes' })
    runFsOp(services, writeFile, { path: '/home/visitor/Desktop/notes/a.txt', text: 'hi\n' })
    const editor = openFromFiles(container, 'Desktop/notes', '/home/visitor/Desktop/notes/a.txt')
    const ui = within(editor)
    fireEvent.change(field(ui, 'a.txt'), { target: { value: 'hi there\n' } })

    runFsOp(services, remove, { path: '/home/visitor/Desktop/notes', recursive: true })
    save(ui)

    expect(folderButton(within(ui.getByRole('dialog', { name: 'Save' }))).textContent).toBe('Documents')
  })

  it('editor saves in place in a nested visitor folder', () => {
    const disk = memoryStorage()
    const { container, services } = renderDesktop({ fs: fsStoreOn(disk) })
    runFsOp(services, mkdir, { path: '/home/visitor/Desktop/notes' })
    runFsOp(services, writeFile, { path: '/home/visitor/Desktop/notes/a.txt', text: 'hi\n' })
    const editor = openFromFiles(container, 'Desktop/notes', '/home/visitor/Desktop/notes/a.txt')
    const ui = within(editor)
    fireEvent.change(field(ui, 'a.txt'), { target: { value: 'hi there\n' } })

    save(ui)

    expect(ui.queryByRole('dialog')).toBeNull()
    expect(headerTitle(editor)).toBe('a.txt')
    expect(fsFiles(disk)['/home/visitor/Desktop/notes/a.txt']).toBe('hi there\n')
  })

  it('editor saves in place an extensionless file', () => {
    const disk = memoryStorage()
    const { container, services } = renderDesktop({ fs: fsStoreOn(disk) })
    runFsOp(services, writeFile, { path: '/home/visitor/Makefile', text: 'all:\n' })
    const editor = openFromFiles(container, '', '/home/visitor/Makefile')
    const ui = within(editor)
    fireEvent.change(field(ui, 'Makefile'), { target: { value: 'all: build\n' } })

    save(ui)

    expect(ui.queryByRole('dialog')).toBeNull()
    expect(headerTitle(editor)).toBe('Makefile')
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Makefile': 'all: build\n' })
  })

  it('reports a full storage on an in-place save and keeps the typing', () => {
    const disk = fsDisk({ [NOTES]: 'buy milk\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(refusingWrites(disk, quotaError())) })
    fireEvent.doubleClick(desktopIcon(container, NOTES))
    const editor = windowsOf(container, 'editor')[0]
    const ui = within(editor)
    fireEvent.change(field(ui, 'notes.txt'), { target: { value: 'too big\n' } })

    save(ui)

    expect(screen.getByRole('status').textContent).toContain("This browser's storage is full.")
    expect(ui.queryByRole('dialog')).toBeNull()
    expect(field(ui, 'notes.txt').value).toBe('too big\n')
    expect(headerTitle(editor)).toBe('• notes.txt')
    expect(fsFiles(disk)[NOTES]).toBe('buy milk\n')
  })
})
