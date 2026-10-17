// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, renderDesktop, windowsOf } from '../../testing/renderRafeyOS'

afterEach(cleanup)

const openFiles = () => {
  const view = renderDesktop()
  clickDock('Files')
  const [win] = windowsOf(view.container, 'files')
  return { ...view, win, ui: within(win) }
}

const item = (win, path) => win.querySelector(`.fbody [data-path="${path}"]`)
const currentLocation = (win) => win.querySelector('.pathbar .cur').textContent

describe('Files app', () => {
  it('opens on Home with folders first', () => {
    const { win } = openFiles()

    const names = [...win.querySelectorAll('.fitem .nm')].map((node) => node.textContent)

    expect(names.slice(0, 5)).toEqual(['blog', 'contact', 'Desktop', 'Music', 'projects'])
    expect(currentLocation(win)).toBe('Home')
  })

  it('navigates into projects on double click and back again', () => {
    const { win, ui } = openFiles()

    fireEvent.doubleClick(item(win, '~/projects'))
    expect(currentLocation(win)).toBe('projects')
    expect(win.getAttribute('aria-label')).toBe('projects')
    expect(win.querySelectorAll('.fitem').length).toBeGreaterThan(0)

    fireEvent.click(ui.getByRole('button', { name: 'Back' }))
    expect(currentLocation(win)).toBe('Home')

    fireEvent.click(ui.getByRole('button', { name: 'Forward' }))
    expect(currentLocation(win)).toBe('projects')
  })

  it('navigates from the pathbar and the sidebar', () => {
    const { win, ui } = openFiles()
    fireEvent.doubleClick(item(win, '~/Music'))

    fireEvent.click(within(win.querySelector('.pathbar')).getByText('Home'))
    expect(currentLocation(win)).toBe('Home')

    fireEvent.click(within(ui.getByRole('navigation', { name: 'Places' })).getByText('blog'))
    expect(currentLocation(win)).toBe('blog')
  })

  it('selects with a click, shows the float bar, and clears on empty space', () => {
    const { win } = openFiles()

    fireEvent.click(item(win, '~/bio.txt'))
    expect(item(win, '~/bio.txt').className).toContain('sel')
    expect(win.querySelector('.floatbar').textContent).toMatch(/^“bio\.txt” selected \(\d+(\.\d)? (bytes|kB)\)$/)

    fireEvent.click(item(win, '~/skills.txt'), { ctrlKey: true })
    expect(win.querySelector('.floatbar').textContent).toBe('2 items selected')

    fireEvent.click(win.querySelector('.fbody'))
    expect(win.querySelector('.floatbar')).toBeNull()
  })

  it('opens the selection with Enter and goes back with Backspace', () => {
    const { win } = openFiles()
    const body = win.querySelector('.fbody')
    fireEvent.click(item(win, '~/contact'))

    fireEvent.keyDown(body, { key: 'Enter' })
    expect(currentLocation(win)).toBe('contact')

    fireEvent.keyDown(body, { key: 'Backspace' })
    expect(currentLocation(win)).toBe('Home')
  })

  it("shows a banner instead of opening files whose app isn't built yet", () => {
    const { win } = openFiles()

    fireEvent.doubleClick(item(win, '~/README.txt'))

    expect(screen.getByRole('status').textContent).toContain("Text Editor isn't available yet.")
  })

  it('switches to the list view with sizes and types', () => {
    const { win, ui } = openFiles()

    fireEvent.click(ui.getByRole('button', { name: 'List view' }))

    const row = item(win, '~/projects')
    expect(row.className).toContain('flr')
    expect(row.textContent).toContain('Folder')
    expect(ui.getByRole('button', { name: 'Grid view' })).toBeTruthy()
  })

  it('searches everywhere and closes the search with Escape', () => {
    const { win, ui } = openFiles()

    fireEvent.click(ui.getByRole('button', { name: 'Search' }))
    const field = ui.getByLabelText('Search files')
    fireEvent.change(field, { target: { value: 'story' } })
    expect([...win.querySelectorAll('.fitem .nm')].map((node) => node.textContent)).toEqual(['story.txt'])
    expect(win.getAttribute('aria-label')).toBe('Search')

    fireEvent.change(field, { target: { value: 'zzz' } })
    expect(ui.getByText('No Results Found')).toBeTruthy()

    fireEvent.keyDown(field, { key: 'Escape' })
    expect(ui.queryByLabelText('Search files')).toBeNull()
  })

  it('shows empty states for Recent and Starred', () => {
    const { ui } = openFiles()
    const places = within(ui.getByRole('navigation', { name: 'Places' }))

    fireEvent.click(places.getByText('Recent'))
    expect(ui.getByText('No Recent Files')).toBeTruthy()

    fireEvent.click(places.getByText('Starred'))
    expect(ui.getByText('No Starred Files')).toBeTruthy()
  })
})
