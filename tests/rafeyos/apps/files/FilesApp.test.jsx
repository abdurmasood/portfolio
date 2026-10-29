// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, fsDisk, fsStoreOn, goToRafeyHome, renderDesktop, runFsOp, settle, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { mkdir, remove, writeFile } from '@/components/rafeyos/core/vfs/fsOps'

afterEach(cleanup)

const openFiles = (overrides) => {
  const view = renderDesktop(overrides)
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
const places = (ui) => within(ui.getByRole('navigation', { name: 'Places' }))
const placeNames = (ui) => [...ui.getByRole('navigation', { name: 'Places' }).querySelectorAll('.srow span')].map((node) => node.textContent)

/** `rm -r path && touch path` in one go: the folder becomes a file of the same name before Files renders again. */
const replaceWithFile = (services, path) =>
  act(() => {
    runFsOp(services, remove, { path, recursive: true })
    runFsOp(services, writeFile, { path, text: '' })
  })

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

describe('Files when the shell changes things underneath it', () => {
  it('files moves up when its folder is deleted', () => {
    const { services, win, ui } = openFiles()
    runFsOp(services, mkdir, { path: '/home/visitor/Documents/notes/deep', parents: true })
    fireEvent.click(places(ui).getByText('Documents'))
    fireEvent.doubleClick(item(win, '/home/visitor/Documents/notes'))
    fireEvent.doubleClick(item(win, '/home/visitor/Documents/notes/deep'))
    expect(currentLocation(win)).toBe('deep')

    runFsOp(services, remove, { path: '/home/visitor/Documents/notes', recursive: true })

    expect(currentLocation(win)).toBe('Documents')
    expect(win.getAttribute('aria-label')).toBe('Documents')
    expect(ui.getByText('Folder is Empty')).toBeTruthy()
    expect(ui.getByRole('button', { name: 'Forward' }).disabled).toBe(true)
  })

  it('keeps back off when the window moves up to the folder it came from', () => {
    const { services, win, ui } = openFiles()
    fireEvent.click(places(ui).getByText('Documents'))

    runFsOp(services, remove, { path: '/home/visitor/Documents', recursive: true })

    expect(currentLocation(win)).toBe('Home')
    expect(ui.getByRole('button', { name: 'Back' }).disabled).toBe(true)
    expect(ui.getByRole('button', { name: 'Forward' }).disabled).toBe(true)
  })

  it('moves up when its folder is replaced by a file of the same name', () => {
    const { services, win, ui } = openFiles()
    runFsOp(services, mkdir, { path: '/home/visitor/Documents/d' })
    fireEvent.click(places(ui).getByText('Documents'))
    fireEvent.doubleClick(item(win, '/home/visitor/Documents/d'))

    replaceWithFile(services, '/home/visitor/Documents/d')

    expect(currentLocation(win)).toBe('Documents')
    expect(item(win, '/home/visitor/Documents/d')).not.toBeNull()
  })

  it('forward skips a folder replaced by a file of the same name', () => {
    const { services, win, ui } = openFiles()
    runFsOp(services, mkdir, { path: '/home/visitor/Documents/d' })
    fireEvent.click(places(ui).getByText('Documents'))
    fireEvent.doubleClick(item(win, '/home/visitor/Documents/d'))
    fireEvent.click(ui.getByRole('button', { name: 'Back' }))
    expect(ui.getByRole('button', { name: 'Forward' }).disabled).toBe(false)

    replaceWithFile(services, '/home/visitor/Documents/d')

    expect(ui.getByRole('button', { name: 'Forward' }).disabled).toBe(true)
  })

  it('sidebar hides a documents folder replaced by a file', () => {
    const { services, ui } = openFiles()

    replaceWithFile(services, '/home/visitor/Documents')

    expect(placeNames(ui)).not.toContain('Documents')
  })

  it('sidebar hides a deleted documents folder', () => {
    const { services, ui } = openFiles()

    runFsOp(services, remove, { path: '/home/visitor/Documents', recursive: true })

    const names = [...ui.getByRole('navigation', { name: 'Places' }).querySelectorAll('.srow span')].map((node) => node.textContent)
    expect(names).toEqual(['Recent', 'Starred', 'Home', 'Desktop', 'Music', 'projects', 'blog', 'contact', 'Trash', 'Other Locations'])
  })

  it('files prunes deleted items from the selection', () => {
    const disk = fsDisk({ '/home/visitor/Documents/notes.txt': 'buy milk\n', '/home/visitor/Documents/todo.txt': 'call\n' })
    const { container, services, win, ui } = openFiles({ fs: fsStoreOn(disk) })
    fireEvent.click(places(ui).getByText('Documents'))
    fireEvent.click(item(win, '/home/visitor/Documents/notes.txt'))
    fireEvent.click(item(win, '/home/visitor/Documents/todo.txt'), { ctrlKey: true })
    expect(win.querySelector('.floatbar').textContent).toBe('2 items selected')

    runFsOp(services, remove, { path: '/home/visitor/Documents/notes.txt' })

    expect(item(win, '/home/visitor/Documents/notes.txt')).toBeNull()
    expect(win.querySelector('.floatbar').textContent).toBe('“todo.txt” selected (5 bytes)')
    fireEvent.keyDown(win.querySelector('.fbody'), { key: 'Enter' })
    expect(windowsOf(container, 'editor').map((editor) => editor.getAttribute('aria-label'))).toEqual(['todo.txt'])
  })
})
