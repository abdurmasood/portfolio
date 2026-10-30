// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  desktopIcon,
  fsDisk,
  fsFiles,
  FIXED_NOW,
  fsStoreOn,
  goToRafeyHome,
  memoryStorage,
  menuEntry,
  quotaError,
  refusingWrites,
  renderDesktop,
  rightClick,
  runFsOp,
  windowsOf,
} from '@/tests/rafeyos/helpers/renderRafeyOS'
import { mkdir } from '@/components/rafeyos/core/vfs/fsOps'
import { trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { FS_KEY } from '@/components/rafeyos/core/vfs/fsStore'
import { seedState, serializeState } from '@/components/rafeyos/core/vfs/fsState'

afterEach(cleanup)

const DESKTOP = '/home/visitor/Desktop'
const wallpaper = () => screen.getByTestId('wallpaper')
// Windows are dialogs too, so the popover is found by its title
const popover = () => screen.getByRole('dialog', { name: /^(New Folder|Rename File|Rename Folder)$/ })
const goTo = (win, place) => fireEvent.click(within(within(win).getByRole('navigation', { name: 'Places' })).getByText(place))
const nameField = () => within(popover()).getByRole('textbox')
const storedState = (disk) => JSON.parse(disk.getItem(FS_KEY))

/** A stored state with these folders and text files (path -> null for a folder, or the text). */
const diskWith = (entries) => {
  const mtime = FIXED_NOW.getTime()
  const seed = seedState(mtime)
  const nodes = Object.fromEntries(Object.entries(entries).map(([path, text]) => [path, text === null ? { type: 'dir', mtime } : { type: 'text', text, mtime }]))
  return memoryStorage({ [FS_KEY]: serializeState({ ...seed, nodes: { ...seed.nodes, ...nodes } }) })
}

/** Types `name` into the open popover and presses its button. */
const answer = (name, button) => {
  fireEvent.change(nameField(), { target: { value: name } })
  fireEvent.click(within(popover()).getByRole('button', { name: button }))
}

const newDesktopFolder = (name) => {
  rightClick(wallpaper(), { clientX: 400, clientY: 300 })
  chooseMenuItem('New Folder…')
  answer(name, 'Create')
}

const iconSpot = (icon) => ({ left: icon.style.left, top: icon.style.top })
const selectedIcons = (container) => [...container.querySelectorAll('.dicon.sel')].map((icon) => icon.dataset.path)

describe('New Folder on the desktop', () => {
  it('asks for a name, then shows the folder selected at the click', () => {
    const disk = fsDisk()
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })

    rightClick(wallpaper(), { clientX: 400, clientY: 300 })
    chooseMenuItem('New Folder…')

    expect(popover().getAttribute('aria-label')).toBe('New Folder')
    expect(nameField().value).toBe('Untitled Folder')
    expect(document.activeElement).toBe(nameField())
    fireEvent.click(within(popover()).getByRole('button', { name: 'Create' }))

    const icon = desktopIcon(container, `${DESKTOP}/Untitled Folder`)
    expect(icon).toBeTruthy()
    expect(iconSpot(icon)).toEqual({ left: '355px', top: '256px' })
    expect(selectedIcons(container)).toEqual([`${DESKTOP}/Untitled Folder`])
    expect(storedState(disk).nodes[`${DESKTOP}/Untitled Folder`]).toMatchObject({ type: 'dir' })
    expect(document.querySelector('.namepop')).toBeNull()
  })

  it('keeps Create off while the name is taken or not allowed', () => {
    renderDesktop({ fs: fsStoreOn(fsDisk({ [`${DESKTOP}/notes`]: 'n\n' })) })
    rightClick(wallpaper())
    chooseMenuItem('New Folder…')
    const create = within(popover()).getByRole('button', { name: 'Create' })

    fireEvent.change(nameField(), { target: { value: 'notes' } })
    expect(create.disabled).toBe(true)
    expect(within(popover()).getByRole('status').textContent).toBe('A file with that name already exists.')
    fireEvent.change(nameField(), { target: { value: 'a/b' } })
    expect(within(popover()).getByRole('status').textContent).toBe('Folder names cannot contain “/”.')
    fireEvent.change(nameField(), { target: { value: '' } })
    expect(create.disabled).toBe(true)
    fireEvent.change(nameField(), { target: { value: '.secret' } })
    expect(create.disabled).toBe(false)
    expect(within(popover()).getByRole('status').textContent).toBe('Folders with “.” at the beginning of their name are hidden.')
  })

  it('says so in place when another tab took the name after the check', () => {
    const disk = fsDisk()
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    rightClick(wallpaper())
    chooseMenuItem('New Folder…')
    // Another tab writes without this one hearing of it yet
    const stored = storedState(disk)
    disk.setItem(FS_KEY, JSON.stringify({ ...stored, nodes: { ...stored.nodes, [`${DESKTOP}/box`]: { type: 'dir', mtime: 1 } } }))

    answer('box', 'Create')

    expect(within(popover()).getByRole('status').textContent).toBe('A file or folder with that name already exists.')
    expect(within(popover()).getByRole('button', { name: 'Create' }).disabled).toBe(true)
    fireEvent.change(nameField(), { target: { value: 'crate' } })
    fireEvent.click(within(popover()).getByRole('button', { name: 'Create' }))
    expect(desktopIcon(container, `${DESKTOP}/crate`)).toBeTruthy()
  })

  it('closes on Escape without making anything', () => {
    const disk = fsDisk()
    renderDesktop({ fs: fsStoreOn(disk) })
    rightClick(wallpaper())
    chooseMenuItem('New Folder…')

    fireEvent.keyDown(nameField(), { key: 'Escape' })

    expect(document.querySelector('.namepop')).toBeNull()
    expect(Object.keys(storedState(disk).nodes)).not.toContain(`${DESKTOP}/Untitled Folder`)
  })

  it('tells the visitor when the browser storage is full', () => {
    const disk = refusingWrites(fsDisk(), quotaError())
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })

    newDesktopFolder('box')

    expect(screen.getByRole('status').textContent).toContain("Couldn't create folder")
    expect(desktopIcon(container, `${DESKTOP}/box`)).toBeNull()
  })
})

describe('Rename on the desktop', () => {
  it('renames a folder in place and keeps it selected', () => {
    const disk = fsDisk()
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    newDesktopFolder('box')
    const spot = iconSpot(desktopIcon(container, `${DESKTOP}/box`))

    rightClick(desktopIcon(container, `${DESKTOP}/box`))
    chooseMenuItem('Rename…')
    expect(popover().getAttribute('aria-label')).toBe('Rename Folder')
    expect(nameField().value).toBe('box')
    answer('crate', 'Rename')

    expect(desktopIcon(container, `${DESKTOP}/box`)).toBeNull()
    expect(iconSpot(desktopIcon(container, `${DESKTOP}/crate`))).toEqual(spot)
    expect(selectedIcons(container)).toEqual([`${DESKTOP}/crate`])
  })

  it('keeps Rename and Move to Trash off for Desktop and the Home icon', () => {
    const { container, services } = renderDesktop()
    runFsOp(services, mkdir, { path: `${DESKTOP}/Documents` })

    rightClick(desktopIcon(container, '/home/visitor'))
    expect(menuEntry('Rename…').disabled).toBe(true)
    expect(menuEntry('Move to Trash').disabled).toBe(true)
    rightClick(desktopIcon(container, `${DESKTOP}/Documents`))
    expect(menuEntry('Rename…').disabled).toBe(false)
  })

  it('moves an open Editor window along with its folder', () => {
    const disk = diskWith({ [`${DESKTOP}/box`]: null, [`${DESKTOP}/box/a.txt`]: 'a\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    fireEvent.doubleClick(desktopIcon(container, `${DESKTOP}/box`))
    const [files] = windowsOf(container, 'files')
    fireEvent.doubleClick(files.querySelector(`[data-path="${DESKTOP}/box/a.txt"]`))
    const [editor] = windowsOf(container, 'editor')
    expect(editor.querySelector('.hb small').textContent).toBe('~/Desktop/box/')

    rightClick(desktopIcon(container, `${DESKTOP}/box`))
    chooseMenuItem('Rename…')
    answer('crate', 'Rename')

    expect(windowsOf(container, 'editor')).toEqual([editor])
    expect(editor.querySelector('.hb small').textContent).toBe('~/Desktop/crate/')
    expect(fsFiles(disk)).toEqual({ [`${DESKTOP}/crate/a.txt`]: 'a\n' })
  })
})

describe('Folders in Trash', () => {
  const openTrash = (container) => {
    clickDock('Files')
    const win = windowsOf(container, 'files').at(-1)
    goTo(win, 'Trash')
    return win
  }

  it('trashes a folder with its contents and restores it whole', () => {
    const disk = diskWith({
      [`${DESKTOP}/box`]: null,
      [`${DESKTOP}/box/a.txt`]: 'a\n',
      [`${DESKTOP}/box/sub`]: null,
      [`${DESKTOP}/box/sub/b.txt`]: 'b\n',
    })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })

    rightClick(desktopIcon(container, `${DESKTOP}/box`))
    chooseMenuItem('Move to Trash')

    expect(desktopIcon(container, `${DESKTOP}/box`)).toBeNull()
    expect(fsFiles(disk)).toEqual({})
    const win = openTrash(container)
    const trashed = win.querySelector(`[data-path="${trashItemPath(`${DESKTOP}/box`)}"]`)
    expect(trashed.textContent).toContain('box')

    fireEvent.doubleClick(trashed)
    expect(win.getAttribute('aria-label')).toBe('Trash')
    rightClick(trashed)
    expect(menuEntry('Open').disabled).toBe(true)
    expect(menuEntry('Open in Terminal').disabled).toBe(true)
    chooseMenuItem('Restore')

    expect(desktopIcon(container, `${DESKTOP}/box`)).toBeTruthy()
    expect(fsFiles(disk)).toEqual({ [`${DESKTOP}/box/a.txt`]: 'a\n', [`${DESKTOP}/box/sub/b.txt`]: 'b\n' })
  })
})

describe('New Folder and Rename in Files', () => {
  const openFilesIn = (disk, place) => {
    const view = renderDesktop({ fs: fsStoreOn(disk) })
    clickDock('Files')
    const [win] = windowsOf(view.container, 'files')
    goTo(win, place)
    return { ...view, win }
  }
  const item = (win, path) => win.querySelector(`.fbody [data-path="${path}"]`)

  it('makes a folder in the open folder and selects it', () => {
    const disk = fsDisk()
    const { win } = openFilesIn(disk, 'Documents')

    rightClick(win.querySelector('.fbody'))
    chooseMenuItem('New Folder…')
    answer('Drafts', 'Create')

    expect(item(win, '/home/visitor/Documents/Drafts').classList.contains('sel')).toBe(true)
  })

  it('renames a file, refusing a name another file has', () => {
    const disk = fsDisk({ '/home/visitor/Documents/a.txt': 'a\n', '/home/visitor/Documents/b.txt': 'b\n' })
    const { win } = openFilesIn(disk, 'Documents')

    rightClick(item(win, '/home/visitor/Documents/a.txt'))
    chooseMenuItem('Rename…')
    expect(popover().getAttribute('aria-label')).toBe('Rename File')
    expect(nameField().selectionEnd).toBe(1)
    fireEvent.change(nameField(), { target: { value: 'b.txt' } })
    expect(within(popover()).getByRole('status').textContent).toBe('A file with that name already exists.')
    answer('c.txt', 'Rename')

    expect(item(win, '/home/visitor/Documents/c.txt').classList.contains('sel')).toBe(true)
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Documents/b.txt': 'b\n', '/home/visitor/Documents/c.txt': 'a\n' })
  })

  it("offers no New Folder in Rafey's home or in Trash", () => {
    const { win } = openFilesIn(fsDisk(), 'Trash')
    rightClick(win.querySelector('.fbody'))
    expect(menuEntry('New Folder…').disabled).toBe(true)

    goToRafeyHome(win)
    rightClick(win.querySelector('.fbody'))
    expect(menuEntry('New Folder…').disabled).toBe(true)
  })
})
