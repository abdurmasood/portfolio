// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  desktopIcon,
  fsDisk,
  fsFiles,
  fsStoreOn,
  headerTitle,
  memoryStorage,
  menuEntry,
  renderDesktop,
  rightClick,
  windowsOf,
} from '@/tests/rafeyos/helpers/renderRafeyOS'
import { LEGACY_KEY } from '@/components/rafeyos/core/vfs/fsStore'

afterEach(cleanup)

const places = (win) => within(within(win).getByRole('navigation', { name: 'Places' }))
const item = (win, path) => win.querySelector(`.fbody [data-path="${path}"]`)

const openFiles = (container) => {
  clickDock('Files')
  return windowsOf(container, 'files')[0]
}

/** Types `text` into a fresh Untitled page and saves it as `name`, in `folder` when given. */
const saveNew = (container, { text, name, folder }) => {
  clickDock('Text Editor')
  const ui = within(windowsOf(container, 'editor')[0])
  fireEvent.change(ui.getByLabelText('Untitled'), { target: { value: text } })
  fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
  chooseMenuItem('Save')
  const dialog = within(ui.getByRole('dialog', { name: 'Save' }))
  fireEvent.change(dialog.getByLabelText('File name'), { target: { value: name } })
  if (folder) {
    fireEvent.click(dialog.getByRole('button', { name: /^Folder / }))
    chooseMenuItem(folder)
  }
  fireEvent.click(dialog.getByRole('button', { name: 'Save' }))
  return ui
}

describe('rafeyOS on the shared filesystem store', () => {
  it('shows a file saved in the editor on the desktop, and keeps it after a reload', () => {
    const disk = fsDisk()
    const first = renderDesktop({ fs: fsStoreOn(disk) })
    saveNew(first.container, { text: 'hello\n', name: 'notes', folder: 'Desktop' })

    expect(desktopIcon(first.container, '/home/visitor/Desktop/notes.txt')).toBeTruthy()
    first.unmount()

    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    expect(desktopIcon(container, '/home/visitor/Desktop/notes.txt')).toBeTruthy()
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Desktop/notes.txt': 'hello\n' })
  })

  it('saves an open file in place, keeping a single copy', () => {
    const disk = fsDisk()
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })
    const ui = saveNew(container, { text: 'one\n', name: 'notes' })

    fireEvent.change(ui.getByLabelText('notes.txt'), { target: { value: 'two\n' } })
    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Save')

    expect(headerTitle(windowsOf(container, 'editor')[0])).toBe('notes.txt')
    expect(fsFiles(disk)).toEqual({ '/home/visitor/Documents/notes.txt': 'two\n' })
    const files = openFiles(container)
    fireEvent.click(places(files).getByText('Documents'))
    expect(files.querySelectorAll('.fbody [data-path="/home/visitor/Documents/notes.txt"]')).toHaveLength(1)
  })

  it('lists a document saved by an older build in the visitor Documents folder', () => {
    const disk = memoryStorage({ [LEGACY_KEY]: JSON.stringify({ files: { '~/Documents/old.txt': 'x' }, trash: {} }) })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })

    const files = openFiles(container)
    fireEvent.click(places(files).getByText('Documents'))

    expect(item(files, '/home/visitor/Documents/old.txt').textContent).toContain('old.txt')
  })

  it('opens Files on the visitor home with its three folders and the usual sidebar', () => {
    const { container } = renderDesktop()

    const files = openFiles(container)

    expect([...files.querySelectorAll('.fbody [data-path]')].map((entry) => entry.dataset.path)).toEqual([
      '/home/visitor/Desktop',
      '/home/visitor/Documents',
      '/home/visitor/Downloads',
    ])
    expect(places(files).getAllByRole('button').map((place) => place.textContent)).toEqual([
      'Recent', 'Starred', 'Home', 'Desktop', 'Documents', 'Music', 'projects', 'blog', 'contact', 'Trash', 'Other Locations',
    ])
  })

  it('keeps Move to Trash disabled on the home folders', () => {
    const { container } = renderDesktop()
    const files = openFiles(container)

    ;['Desktop', 'Documents', 'Downloads'].forEach((name) => {
      rightClick(item(files, `/home/visitor/${name}`))
      expect(menuEntry('Move to Trash').disabled).toBe(true)
      fireEvent.keyDown(window, { key: 'Escape' })
    })
  })
})
