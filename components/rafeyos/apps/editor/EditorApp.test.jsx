// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  desktopIcon,
  headerTitle,
  menuEntry,
  menuLabels,
  renderDesktop,
  windowsOf,
} from '../../testing/renderRafeyOS'
import { realContent, realVfs } from '../../vfs/testVfs'
import { textDocuments } from '../../vfs/queries'
import { documentLabel } from './editorMenus'

afterEach(cleanup)

const openBio = () => {
  const view = renderDesktop()
  fireEvent.doubleClick(desktopIcon(view.container, '~/Desktop/bio.txt'))
  const [win] = windowsOf(view.container, 'editor')
  return { ...view, win, ui: within(win) }
}

describe('Text Editor', () => {
  it("opens bio.txt with its text, its name as the title and its folder as the subtitle", () => {
    const { win, ui } = openBio()

    expect(ui.getByLabelText('bio.txt').value).toBe(realContent.bio)
    expect(headerTitle(win)).toBe('bio.txt')
    expect(win.querySelector('.hb .ttl small').textContent).toBe('~/')
    expect(win.getAttribute('aria-label')).toBe('bio.txt')
  })

  it('marks the title while the text differs from the file', () => {
    const { win, ui } = openBio()
    const text = ui.getByLabelText('bio.txt')

    fireEvent.change(text, { target: { value: 'edited' } })
    expect(headerTitle(win)).toBe('• bio.txt')

    fireEvent.change(text, { target: { value: realContent.bio } })
    expect(headerTitle(win)).toBe('bio.txt')
  })

  it('drops edits when the window closes', () => {
    const { container, win, ui } = openBio()
    fireEvent.change(ui.getByLabelText('bio.txt'), { target: { value: 'edited' } })

    fireEvent.click(ui.getByRole('button', { name: 'Close' }))
    fireEvent.doubleClick(desktopIcon(container, '~/Desktop/bio.txt'))

    const [reopened] = windowsOf(container, 'editor')
    expect(reopened).not.toBe(win)
    expect(within(reopened).getByLabelText('bio.txt').value).toBe(realContent.bio)
  })

  it('keeps one window per file', () => {
    const { container } = openBio()

    fireEvent.doubleClick(desktopIcon(container, '~/Desktop/bio.txt'))

    expect(windowsOf(container, 'editor')).toHaveLength(1)
  })

  it('lists every text document under Open and opens the one picked', () => {
    const { container, ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: /^Open/ }))

    expect(screen.getByText('Recent Documents')).toBeTruthy()
    expect(menuLabels()).toEqual(textDocuments(realVfs).map((path) => documentLabel(realVfs, path)))
    chooseMenuItem(/^README\.txt\s+~$/)
    const readme = windowsOf(container, 'editor')[1]
    expect(readme.getAttribute('aria-label')).toBe('README.txt')
    expect(within(readme).getByLabelText('README.txt').className).toBe('small')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('shows its file in Files, selected', () => {
    const { container, ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Show in Files')

    const [files] = windowsOf(container, 'files')
    expect(files.getAttribute('aria-label')).toBe('Home')
    expect(files.querySelector('.fbody [data-path="~/bio.txt"]').className).toContain('sel')
  })

  it("opens a terminal in its file's folder", () => {
    const { container, ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))
    chooseMenuItem('Open in Terminal')

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey: ~')
  })

  it('shows Save, Preferences and About disabled, and the New tab button disabled', () => {
    const { ui } = openBio()

    fireEvent.click(ui.getByRole('button', { name: 'Main Menu' }))

    expect(menuLabels()).toEqual(['Show in Files', 'Open in Terminal', 'Save', 'Preferences', 'About Text Editor'])
    ;['Save', 'Preferences', 'About Text Editor'].forEach((name) => expect(menuEntry(name).disabled).toBe(true))
    expect(ui.getByRole('button', { name: 'New tab' }).disabled).toBe(true)
  })

  it('opens README from the dock', () => {
    const { container } = renderDesktop()

    clickDock('Text Editor')

    expect(windowsOf(container, 'editor')[0].getAttribute('aria-label')).toBe('README.txt')
  })
})
