// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, within } from '@testing-library/react'
import { chooseMenuItem, desktopIcon, fsDisk, fsStoreOn, renderDesktop, rightClick, runFsOp, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { mkdir, remove } from '@/components/rafeyos/core/vfs/fsOps'
import { propertiesRows } from '@/components/rafeyos/apps/properties/logic/propertiesRows'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'
import { sizeLabel } from '@/components/rafeyos/core/vfs/queries'
import { trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { mergeState, seedState } from '@/components/rafeyos/core/vfs/fsState'

afterEach(cleanup)

const rowsOf = (win) =>
  [...win.querySelectorAll('.boxed .row')].map((row) => [row.querySelector('.rt').textContent, row.querySelector('.rv').textContent])

const openProperties = (path) => {
  const view = renderDesktop()
  rightClick(desktopIcon(view.container, path))
  chooseMenuItem('Properties')
  const [win] = windowsOf(view.container, 'properties')
  return { ...view, win, ui: within(win) }
}

describe('Properties', () => {
  it('shows a file, with no terminal button', () => {
    const disk = fsDisk({ '/home/visitor/Desktop/note.txt': 'desk\n' })
    const view = renderDesktop({ fs: fsStoreOn(disk) })
    rightClick(desktopIcon(view.container, '/home/visitor/Desktop/note.txt'))
    chooseMenuItem('Properties')
    const [win] = windowsOf(view.container, 'properties')
    const ui = within(win)

    expect(win.getAttribute('aria-label')).toBe('note.txt Properties')
    expect(win.querySelector('.pn').textContent).toBe('note.txt')
    expect(rowsOf(win)).toEqual([
      ['Size', '5 bytes'],
      ['Type', 'Plain text document'],
      ['Parent Folder', '/home/visitor/Desktop'],
    ])
    expect(ui.queryByRole('button', { name: 'Open in Terminal' })).toBeNull()
  })

  it('shows a folder, and opens a terminal there', () => {
    const { container, win, ui } = openProperties('/home/visitor')

    expect(win.getAttribute('aria-label')).toBe('Home Properties')
    expect(rowsOf(win)).toEqual([
      ['Size', '3 items'],
      ['Type', 'Folder'],
      ['Parent Folder', '/home'],
    ])

    fireEvent.click(ui.getByRole('button', { name: 'Open in Terminal' }))
    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey: ~')
  })

  it('properties shows a deleted file as gone', () => {
    const disk = fsDisk({ '/home/visitor/Desktop/note.txt': 'desk\n' })
    const view = renderDesktop({ fs: fsStoreOn(disk) })
    rightClick(desktopIcon(view.container, '/home/visitor/Desktop/note.txt'))
    chooseMenuItem('Properties')

    runFsOp(view.services, remove, { path: '/home/visitor/Desktop/note.txt' })

    const [win] = windowsOf(view.container, 'properties')
    expect(win.getAttribute('aria-label')).toBe('note.txt Properties')
    expect(win.querySelector('.pn').textContent).toBe('note.txt')
    expect(win.querySelector('.props svg path[d^="M20 28h24"]')).not.toBeNull()
    expect(rowsOf(win)).toEqual([
      ['Size', '0 bytes'],
      ['Type', 'Unknown'],
      ['Parent Folder', '/home/visitor/Desktop'],
    ])
  })

  it('hides Open in Terminal once a folder it shows is deleted', () => {
    const view = renderDesktop()
    runFsOp(view.services, mkdir, { path: '/home/visitor/Desktop/notes' })
    rightClick(desktopIcon(view.container, '/home/visitor/Desktop/notes'))
    chooseMenuItem('Properties')
    const [win] = windowsOf(view.container, 'properties')
    expect(within(win).getByRole('button', { name: 'Open in Terminal' })).toBeTruthy()

    runFsOp(view.services, remove, { path: '/home/visitor/Desktop/notes', recursive: true })

    expect(windowsOf(view.container, 'properties')).toEqual([win])
    expect(within(win).queryByRole('button', { name: 'Open in Terminal' })).toBeNull()
    expect(rowsOf(win)[1]).toEqual(['Type', 'Unknown'])
  })

  it('keeps one window per path and stays out of the dock', () => {
    const { container } = openProperties('/home/visitor')

    rightClick(desktopIcon(container, '/home/visitor'))
    chooseMenuItem('Properties')

    expect(windowsOf(container, 'properties')).toHaveLength(1)
    expect(container.querySelector('.dock [aria-label="Properties"]')).toBeNull()
  })
})

describe('propertiesRows', () => {
  it('describes a plain file', () => {
    expect(propertiesRows(realVfs, '/home/rafey/Music/story.txt')).toEqual([
      { label: 'Size', value: sizeLabel(realVfs, '/home/rafey/Music/story.txt') },
      { label: 'Type', value: 'Plain text document' },
      { label: 'Parent Folder', value: '/home/rafey/Music' },
    ])
  })

  it('leaves out the parent of the root', () => {
    expect(propertiesRows(realVfs, '/').map((row) => row.label)).toEqual(['Size', 'Type'])
    expect(propertiesRows(realVfs, '/home').find((row) => row.label === 'Parent Folder').value).toBe('/')
  })

  it('names where a trashed file came from', () => {
    const merged = mergeState(realVfs, { ...seedState(0), trash: { '/home/visitor/Desktop/notes.txt': { node: { type: 'text', text: 'hello\n', mtime: 0 }, mtime: 0 } } })
    const path = trashItemPath('/home/visitor/Desktop/notes.txt')

    expect(propertiesRows(merged, path).find((row) => row.label === 'Original Location').value).toBe('/home/visitor/Desktop/notes.txt')
  })
})
