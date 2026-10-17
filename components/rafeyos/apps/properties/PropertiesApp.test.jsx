// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, within } from '@testing-library/react'
import { chooseMenuItem, desktopIcon, renderDesktop, rightClick, windowsOf } from '../../testing/renderRafeyOS'
import { propertiesRows } from './propertiesRows'
import { realVfs } from '../../vfs/testVfs'
import { sizeLabel } from '../../vfs/queries'
import { mergeDocuments, trashItemPath } from '../../vfs/documents'

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
  it('shows a link with its target', () => {
    const { win, ui } = openProperties('~/Desktop/bio.txt')

    expect(win.getAttribute('aria-label')).toBe('bio.txt Properties')
    expect(win.querySelector('.pn').textContent).toBe('bio.txt')
    expect(rowsOf(win)).toEqual([
      ['Size', sizeLabel(realVfs, '~/bio.txt')],
      ['Type', 'Link to plain text document'],
      ['Link Target', '/home/visitor/bio.txt'],
      ['Parent Folder', '/home/visitor/Desktop'],
    ])
    expect(ui.queryByRole('button', { name: 'Open in Terminal' })).toBeNull()
  })

  it('shows a folder, and opens a terminal there', () => {
    const { container, win, ui } = openProperties('~')

    expect(win.getAttribute('aria-label')).toBe('Home Properties')
    expect(rowsOf(win)).toEqual([
      ['Size', sizeLabel(realVfs, '~')],
      ['Type', 'Folder'],
      ['Parent Folder', '/home'],
    ])

    fireEvent.click(ui.getByRole('button', { name: 'Open in Terminal' }))
    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey: ~')
  })

  it('keeps one window per path and stays out of the dock', () => {
    const { container } = openProperties('~')

    rightClick(desktopIcon(container, '~'))
    chooseMenuItem('Properties')

    expect(windowsOf(container, 'properties')).toHaveLength(1)
    expect(container.querySelector('.dock [aria-label="Properties"]')).toBeNull()
  })
})

describe('propertiesRows', () => {
  it('describes a plain file', () => {
    expect(propertiesRows(realVfs, '~/Music/story.txt')).toEqual([
      { label: 'Size', value: sizeLabel(realVfs, '~/Music/story.txt') },
      { label: 'Type', value: 'Plain text document' },
      { label: 'Parent Folder', value: '/home/visitor/Music' },
    ])
  })

  it('calls a link to a folder a folder, with its target', () => {
    expect(propertiesRows(realVfs, '~/Desktop/projects').map((row) => row.value).slice(1)).toEqual([
      'Folder',
      '/home/visitor/projects',
      '/home/visitor/Desktop',
    ])
  })

  it('names where a trashed file came from', () => {
    const merged = mergeDocuments(realVfs, {}, { '~/Desktop/notes.txt': 'hello\n' })
    const path = trashItemPath('~/Desktop/notes.txt')

    expect(propertiesRows(merged, path).find((row) => row.label === 'Original Location').value).toBe('/home/visitor/Desktop/notes.txt')
  })
})
