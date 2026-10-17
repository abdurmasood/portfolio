// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  menuEntry,
  menuLabels,
  renderDesktop,
  rightClick,
  windowsOf,
} from '../../testing/renderRafeyOS'

afterEach(cleanup)

const openFiles = () => {
  const view = renderDesktop()
  clickDock('Files')
  const [win] = windowsOf(view.container, 'files')
  return { ...view, win, ui: within(win) }
}

const item = (win, path) => win.querySelector(`.fbody [data-path="${path}"]`)
const body = (win) => win.querySelector('.fbody')
const goTo = (ui, place) => fireEvent.click(within(ui.getByRole('navigation', { name: 'Places' })).getByText(place))

describe('Files item menu', () => {
  it('matches the desktop menu without Show in Files', () => {
    const { win } = openFiles()

    rightClick(item(win, '~/projects'))

    expect(menuLabels()).toEqual([
      'Open', 'Open With…', 'Cut', 'Copy', 'Rename…', 'Move to Trash', 'Open in Terminal', 'Properties',
    ])
    expect(item(win, '~/projects').className).toContain('sel')
  })

  it('keeps an existing multi-selection when right-clicking inside it', () => {
    const { win } = openFiles()
    fireEvent.click(item(win, '~/bio.txt'))
    fireEvent.click(item(win, '~/skills.txt'), { ctrlKey: true })

    rightClick(item(win, '~/skills.txt'))

    expect(win.querySelectorAll('.fbody .sel')).toHaveLength(2)
    expect(menuLabels()).not.toContain('Open in Terminal')
  })

  it('opens a terminal in the folder and shows Properties', () => {
    const { container, win } = openFiles()

    rightClick(item(win, '~/blog'))
    chooseMenuItem('Open in Terminal')
    rightClick(item(win, '~/skills.txt'))
    chooseMenuItem('Properties')

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey: ~/blog')
    expect(windowsOf(container, 'properties')[0].getAttribute('aria-label')).toBe('skills.txt Properties')
  })

  it('opens a folder in a new Files window', () => {
    const { container, win } = openFiles()
    rightClick(item(win, '~/Music'))

    chooseMenuItem('Open')

    expect(windowsOf(container, 'files').map((files) => files.getAttribute('aria-label'))).toEqual(['Home', 'Music'])
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

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey: ~/Music')
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

describe('Files header menus', () => {
  it('switches views from View options', () => {
    const { win, ui } = openFiles()

    fireEvent.click(ui.getByRole('button', { name: 'View options' }))
    expect(menuLabels()).toEqual(['Grid', 'List', 'Sort by Name', 'Show Hidden Files'])
    expect(menuEntry('Sort by Name').disabled).toBe(true)
    expect(menuEntry('Show Hidden Files').disabled).toBe(true)
    chooseMenuItem('List')
    expect(item(win, '~/projects').className).toContain('flr')

    fireEvent.click(ui.getByRole('button', { name: 'View options' }))
    chooseMenuItem('Grid')
    expect(item(win, '~/projects').className).toContain('fitem')
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
