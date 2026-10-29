// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  dock,
  fsDisk,
  fsFiles,
  fsStoreOn,
  fsTrash,
  goToRafeyHome,
  menuEntry,
  menuLabels,
  quotaError,
  refusingWrites,
  renderDesktop,
  rightClick,
  runFsOp,
  windowsOf,
} from '@/tests/rafeyos/helpers/renderRafeyOS'
import { symlink } from '@/components/rafeyos/core/vfs/fsOps'
import { trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { FS_KEY } from '@/components/rafeyos/core/vfs/fsStore'

afterEach(cleanup)

const openFiles = () => {
  const view = renderDesktop()
  clickDock('Files')
  const [win] = windowsOf(view.container, 'files')
  return { ...view, win, ui: within(win) }
}

/** Files open on Rafey's home, where his folders and notes are. */
const openRafeyHome = () => {
  const files = openFiles()
  goToRafeyHome(files.win)
  return files
}

const item = (win, path) => win.querySelector(`.fbody [data-path="${path}"]`)
const body = (win) => win.querySelector('.fbody')
const goTo = (ui, place) => fireEvent.click(within(ui.getByRole('navigation', { name: 'Places' })).getByText(place))

describe('Files item menu', () => {
  it('matches the desktop menu without Show in Files', () => {
    const { win } = openRafeyHome()

    rightClick(item(win, '/home/rafey/projects'))

    expect(menuLabels()).toEqual([
      'Open', 'Open With…', 'Cut', 'Copy', 'Rename…', 'Move to Trash', 'Open in Terminal', 'Properties',
    ])
    expect(item(win, '/home/rafey/projects').className).toContain('sel')
  })

  it('keeps an existing multi-selection when right-clicking inside it', () => {
    const { win } = openRafeyHome()
    fireEvent.click(item(win, '/home/rafey/bio.txt'))
    fireEvent.click(item(win, '/home/rafey/skills.txt'), { ctrlKey: true })

    rightClick(item(win, '/home/rafey/skills.txt'))

    expect(win.querySelectorAll('.fbody .sel')).toHaveLength(2)
    expect(menuLabels()).not.toContain('Open in Terminal')
  })

  it('opens a terminal in the folder and shows Properties', () => {
    const { container, win } = openRafeyHome()

    rightClick(item(win, '/home/rafey/blog'))
    chooseMenuItem('Open in Terminal')
    rightClick(item(win, '/home/rafey/skills.txt'))
    chooseMenuItem('Properties')

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey.ai: /home/rafey/blog')
    expect(windowsOf(container, 'properties')[0].getAttribute('aria-label')).toBe('skills.txt Properties')
  })

  it('opens a folder in a new Files window', () => {
    const { container, win } = openFiles()
    rightClick(item(win, '/home/visitor/Desktop'))

    chooseMenuItem('Open')

    expect(windowsOf(container, 'files').map((files) => files.getAttribute('aria-label'))).toEqual(['Home', 'Desktop'])
  })
})

describe('Files background menu', () => {
  it('selects everything listed', () => {
    const { win } = openFiles()

    rightClick(body(win))
    expect(menuLabels()).toEqual(['New Folder…', 'Paste', 'Select All', 'Open in Terminal', 'Properties'])
    chooseMenuItem('Select All')

    const count = win.querySelectorAll('.fbody .fitem').length
    expect(win.querySelectorAll('.fbody .sel')).toHaveLength(count)
    expect(win.querySelector('.floatbar').textContent).toBe(`${count} items selected`)
  })

  it('opens a terminal in the current folder and its Properties', () => {
    const { container, win, ui } = openFiles()
    goTo(ui, 'Music')

    rightClick(body(win))
    chooseMenuItem('Open in Terminal')
    rightClick(body(win))
    chooseMenuItem('Properties')

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey.ai: /home/rafey/Music')
    expect(windowsOf(container, 'properties')[0].getAttribute('aria-label')).toBe('Music Properties')
  })

  it('has no terminal in Trash, and no menu in Recent', () => {
    const { win, ui } = openFiles()

    goTo(ui, 'Trash')
    rightClick(body(win))
    expect(menuEntry('Open in Terminal').disabled).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })

    goTo(ui, 'Recent')
    rightClick(body(win))
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

describe('Trash', () => {
  it('moves a created file into Trash and restores it to its folder', () => {
    const disk = fsDisk({ '/home/visitor/Documents/notes.txt': 'hello\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    clickDock('Files')
    const win = windowsOf(container, 'files')[0]
    const ui = within(win)

    goTo(ui, 'Documents')
    rightClick(item(win, '/home/visitor/Documents/notes.txt'))
    expect(menuEntry('Move to Trash').disabled).toBe(false)
    chooseMenuItem('Move to Trash')

    expect(item(win, '/home/visitor/Documents/notes.txt')).toBeNull()
    goTo(ui, 'Trash')
    const trashed = trashItemPath('/home/visitor/Documents/notes.txt')
    expect(item(win, trashed).textContent).toContain('notes.txt')
    rightClick(item(win, trashed))
    chooseMenuItem('Restore')

    goTo(ui, 'Documents')
    expect(item(win, '/home/visitor/Documents/notes.txt')).toBeTruthy()
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Documents/notes.txt': 'hello\n' })
    expect(fsTrash(disk)).toEqual({})
  })

  it('keeps the file in Trash when its original place is taken', () => {
    const disk = fsDisk({ '/home/visitor/Desktop/a.txt': 'live\n' }, { '/home/visitor/Desktop/a.txt': 'old\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    clickDock('Files')
    const win = windowsOf(container, 'files')[0]

    goTo(within(win), 'Trash')
    const trashed = trashItemPath('/home/visitor/Desktop/a.txt')
    rightClick(item(win, trashed))
    chooseMenuItem('Restore')

    expect(screen.getByRole('status').textContent).toContain('already in Desktop')
    expect(item(win, trashed)).toBeTruthy()
    expect(fsTrash(disk)['/home/visitor/Desktop/a.txt']).toBe('old\n')
  })

  it('empties Trash from the folder and from a file inside it', () => {
    const disk = fsDisk({ '/home/visitor/Desktop/keep.txt': 'stay\n' }, { '/home/visitor/Documents/notes.txt': 'gone\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    clickDock('Files')
    const win = windowsOf(container, 'files')[0]
    const ui = within(win)
    const trashed = trashItemPath('/home/visitor/Documents/notes.txt')

    goTo(ui, 'Trash')
    rightClick(body(win))
    expect(menuEntry('Empty Trash').disabled).toBe(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    rightClick(item(win, trashed))
    chooseMenuItem('Empty Trash')

    expect(ui.getByText('Trash is Empty')).toBeTruthy()
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Desktop/keep.txt': 'stay\n' })
    expect(fsTrash(disk)).toEqual({})
  })

  it('says the browser blocked it when a file cannot be moved to Trash, leaving the file in place', () => {
    const disk = fsDisk({ '/home/visitor/Documents/notes.txt': 'hello\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(refusingWrites(disk, new Error('denied'))) })
    clickDock('Files')
    const win = windowsOf(container, 'files')[0]

    goTo(within(win), 'Documents')
    rightClick(item(win, '/home/visitor/Documents/notes.txt'))
    chooseMenuItem('Move to Trash')

    expect(screen.getByRole('status').textContent).toContain("Couldn't move to Trash")
    expect(screen.getByRole('status').textContent).toContain('This browser blocked saving the file.')
    expect(item(win, '/home/visitor/Documents/notes.txt')).toBeTruthy()
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Documents/notes.txt': 'hello\n' })
    expect(fsTrash(disk)).toEqual({})
  })

  it('stays quiet when another tab already moved the file to Trash, since storage did not fail', () => {
    const disk = fsDisk({ '/home/visitor/Documents/notes.txt': 'hello\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    clickDock('Files')
    const win = windowsOf(container, 'files')[0]
    // The other tab's write, before this tab has heard about it
    disk.setItem(FS_KEY, fsDisk({}, { '/home/visitor/Documents/notes.txt': 'hello\n' }).getItem(FS_KEY))

    goTo(within(win), 'Documents')
    rightClick(item(win, '/home/visitor/Documents/notes.txt'))
    chooseMenuItem('Move to Trash')

    expect(screen.queryByRole('status')).toBeNull()
    expect(fsTrash(disk)).toEqual({ '/home/visitor/Documents/notes.txt': 'hello\n' })
  })

  it('says the storage is full when a restore or Empty Trash cannot be written, keeping the bin', () => {
    const disk = fsDisk({}, { '/home/visitor/Desktop/old.txt': 'old\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(refusingWrites(disk, quotaError())) })
    clickDock('Files')
    const win = windowsOf(container, 'files')[0]
    const trashed = trashItemPath('/home/visitor/Desktop/old.txt')

    goTo(within(win), 'Trash')
    rightClick(item(win, trashed))
    chooseMenuItem('Restore')

    expect(screen.getByRole('status').textContent).toContain("Couldn't restore")
    expect(screen.getByRole('status').textContent).toContain("This browser's storage is full.")

    rightClick(item(win, trashed))
    chooseMenuItem('Empty Trash')

    expect(screen.getByRole('status').textContent).toContain("Couldn't empty Trash")
    expect(screen.getByRole('status').textContent).toContain("This browser's storage is full.")
    expect(item(win, trashed)).toBeTruthy()
    expect(fsTrash(disk)).toEqual({ '/home/visitor/Desktop/old.txt': 'old\n' })
  })

  it('empties Trash from the dock icon, and disables the command when the bin is empty', () => {
    const disk = fsDisk({}, { '/home/visitor/Desktop/old.txt': 'old\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    const trashButton = () => within(dock()).getByRole('button', { name: 'Trash' })

    rightClick(trashButton())
    chooseMenuItem('Empty Trash')

    expect(fsTrash(disk)).toEqual({})
    rightClick(trashButton())
    expect(menuEntry('Empty Trash').disabled).toBe(true)

    clickDock('Files')
    const win = windowsOf(container, 'files')[0]
    goTo(within(win), 'Trash')
    rightClick(body(win))
    expect(menuEntry('Empty Trash').disabled).toBe(true)
  })
})

describe('Files header menus', () => {
  it('switches views from View options', () => {
    const { win, ui } = openRafeyHome()

    fireEvent.click(ui.getByRole('button', { name: 'View options' }))
    expect(menuLabels()).toEqual(['Grid', 'List', 'Sort by Name', 'Show Hidden Files'])
    expect(menuEntry('Sort by Name').disabled).toBe(true)
    expect(menuEntry('Show Hidden Files').disabled).toBe(true)
    chooseMenuItem('List')
    expect(item(win, '/home/rafey/projects').className).toContain('flr')

    fireEvent.click(ui.getByRole('button', { name: 'View options' }))
    chooseMenuItem('Grid')
    expect(item(win, '/home/rafey/projects').className).toContain('fitem')
  })

  it('opens a new window at the same place from the main menu', () => {
    const { container, ui } = openFiles()
    goTo(ui, 'blog')

    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
    expect(menuLabels()).toEqual(['New Window', 'Preferences', 'Keyboard Shortcuts', 'Help', 'About Files'])
    ;['Preferences', 'Keyboard Shortcuts', 'Help', 'About Files'].forEach((name) => expect(menuEntry(name).disabled).toBe(true))
    chooseMenuItem('New Window')

    expect(windowsOf(container, 'files').map((files) => files.getAttribute('aria-label'))).toEqual(['blog', 'blog'])
  })
})

describe('a dangling link', () => {
  it('dangling link lists selects opens and shows properties', () => {
    const { container, services } = renderDesktop()
    const link = '/home/visitor/Desktop/p'
    runFsOp(services, symlink, { target: 'gone.txt', path: link })
    clickDock('Files')
    const win = windowsOf(container, 'files')[0]
    const ui = within(win)

    goTo(ui, 'Desktop')
    expect(item(win, link).textContent).toBe('p')
    expect(container.querySelector(`.dicon[data-path="${link}"]`)).toBeTruthy()
    fireEvent.click(item(win, link))
    expect(win.querySelector('.floatbar').textContent).toBe('“p” selected (0 bytes)')
    fireEvent.click(ui.getByRole('button', { name: 'List view' }))
    expect(item(win, link).textContent).toContain('Link (broken)')

    fireEvent.doubleClick(item(win, link))
    expect(screen.getByRole('status').textContent).toContain("Can't open “p”")

    rightClick(item(win, link))
    chooseMenuItem('Properties')
    const [properties] = windowsOf(container, 'properties')
    const rows = [...properties.querySelectorAll('.boxed .row')].map((row) => [row.querySelector('.rt').textContent, row.querySelector('.rv').textContent])
    expect(properties.getAttribute('aria-label')).toBe('p Properties')
    expect(rows).toEqual([
      ['Size', '0 bytes'],
      ['Type', 'Link (broken)'],
      ['Link Target', 'gone.txt'],
      ['Parent Folder', '/home/visitor/Desktop'],
    ])
  })
})
