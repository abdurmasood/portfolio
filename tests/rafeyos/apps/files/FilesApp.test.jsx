// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, goToRafeyHome, renderDesktop, settle, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'

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
const currentLocation = (win) => win.querySelector('.pathbar .cur').textContent

describe('Files app', () => {
  it('opens on the visitor\'s Home', () => {
    const { win } = openFiles()

    const names = [...win.querySelectorAll('.fitem .nm')].map((node) => node.textContent)

    expect(names).toEqual(['Desktop', 'Documents', 'Downloads'])
    expect(currentLocation(win)).toBe('Home')
    expect([...win.querySelectorAll('.pathbar button')].map((button) => button.textContent)).toEqual(['Home'])
  })

  it('reaches Rafey\'s files through the full path from /, with folders first', () => {
    const { win, ui } = openFiles()

    fireEvent.click(within(ui.getByRole('navigation', { name: 'Places' })).getByText('projects'))
    expect([...win.querySelectorAll('.pathbar button')].map((button) => button.textContent)).toEqual(['/', 'home', 'rafey', 'projects'])
    expect(win.querySelector('.pathbar').textContent).toBe('/home/rafey/projects')

    fireEvent.click(within(win.querySelector('.pathbar')).getByText('rafey'))
    const names = [...win.querySelectorAll('.fitem .nm')].map((node) => node.textContent)
    expect(names.slice(0, 4)).toEqual(['blog', 'contact', 'Music', 'projects'])
    expect(names).toContain('bio.txt')

    fireEvent.click(within(win.querySelector('.pathbar')).getByRole('button', { name: '/' }))
    expect([...win.querySelectorAll('.fitem .nm')].map((node) => node.textContent)).toEqual(['bin', 'etc', 'home', 'tmp', 'usr'])
  })

  it('navigates into projects on double click and back again', () => {
    const { win, ui } = openRafeyHome()

    fireEvent.doubleClick(item(win, '/home/rafey/projects'))
    expect(currentLocation(win)).toBe('projects')
    expect(win.getAttribute('aria-label')).toBe('projects')
    expect(win.querySelectorAll('.fitem').length).toBeGreaterThan(0)

    fireEvent.click(ui.getByRole('button', { name: 'Back' }))
    expect(currentLocation(win)).toBe('rafey')

    fireEvent.click(ui.getByRole('button', { name: 'Forward' }))
    expect(currentLocation(win)).toBe('projects')
  })

  it('navigates from the pathbar and the sidebar', () => {
    const { win, ui } = openFiles()
    fireEvent.doubleClick(item(win, '/home/visitor/Desktop'))
    expect(win.querySelector('.pathbar').textContent).toBe('Home/Desktop')

    fireEvent.click(within(win.querySelector('.pathbar')).getByText('Home'))
    expect(currentLocation(win)).toBe('Home')

    fireEvent.click(within(ui.getByRole('navigation', { name: 'Places' })).getByText('blog'))
    expect(currentLocation(win)).toBe('blog')
  })

  it('selects with a click, shows the float bar, and clears on empty space', () => {
    const { win } = openRafeyHome()

    fireEvent.click(item(win, '/home/rafey/bio.txt'))
    expect(item(win, '/home/rafey/bio.txt').className).toContain('sel')
    expect(win.querySelector('.floatbar').textContent).toMatch(/^“bio\.txt” selected \(\d+(\.\d)? (bytes|kB)\)$/)

    fireEvent.click(item(win, '/home/rafey/skills.txt'), { ctrlKey: true })
    expect(win.querySelector('.floatbar').textContent).toBe('2 items selected')

    fireEvent.click(win.querySelector('.fbody'))
    expect(win.querySelector('.floatbar')).toBeNull()
  })

  it('opens the selection with Enter and goes back with Backspace', () => {
    const { win } = openRafeyHome()
    const body = win.querySelector('.fbody')
    fireEvent.click(item(win, '/home/rafey/contact'))

    fireEvent.keyDown(body, { key: 'Enter' })
    expect(currentLocation(win)).toBe('contact')

    fireEvent.keyDown(body, { key: 'Backspace' })
    expect(currentLocation(win)).toBe('rafey')
  })

  it('opens an audio file in Music and starts playing it', async () => {
    const { container, services, win } = openRafeyHome()
    fireEvent.doubleClick(item(win, '/home/rafey/Music'))

    fireEvent.doubleClick(item(win, '/home/rafey/Music/storms-ahead.mp3'))
    await settle()

    const [music] = windowsOf(container, 'music')
    expect(services.createAudio).toHaveBeenCalledWith('/background-music.mp3')
    expect(services.createAudio.last().play).toHaveBeenCalledTimes(1)
    expect(within(music).getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Storms AheadRamé Sivano')
  })

  it('opens text files in the Text Editor', () => {
    const { container, win } = openRafeyHome()

    fireEvent.doubleClick(item(win, '/home/rafey/README.txt'))

    expect(windowsOf(container, 'editor')[0].getAttribute('aria-label')).toBe('README.txt')
  })

  it('switches to the list view with sizes and types', () => {
    const { win, ui } = openRafeyHome()

    fireEvent.click(ui.getByRole('button', { name: 'List view' }))

    const row = item(win, '/home/rafey/projects')
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
