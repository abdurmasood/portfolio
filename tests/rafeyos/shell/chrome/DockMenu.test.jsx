// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { chooseMenuItem, clickDock, dock, menuEntry, menuLabels, openMenu, renderDesktop, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'

afterEach(cleanup)

const dockButton = (name) => within(dock()).getByRole('button', { name })
const rightClickDock = (name) => fireEvent.contextMenu(dockButton(name))

describe('dock menu', () => {
  it('offers New Window and a disabled App Details for an app that is not running', () => {
    const { container } = renderDesktop()

    rightClickDock('Mail')

    expect(openMenu().className).toBe('shm')
    expect(menuLabels()).toEqual(['New Window', 'App Details'])
    expect(menuEntry('App Details').disabled).toBe(true)
    chooseMenuItem('New Window')
    expect(windowsOf(container, 'mail')).toHaveLength(1)
  })

  it('lists the windows and quits them all', () => {
    const { container } = renderDesktop()
    clickDock('Terminal')
    rightClickDock('Terminal')
    chooseMenuItem('New Window')

    rightClickDock('Terminal')
    expect(menuLabels()).toEqual(['visitor@rafey: /home/rafey', 'visitor@rafey: /home/rafey', 'New Window', 'App Details', 'Quit 2 Windows'])
    chooseMenuItem('Quit 2 Windows')

    expect(windowsOf(container, 'terminal')).toHaveLength(0)
    expect(screen.queryByTestId('dots-terminal')).toBeNull()
  })

  it('says Quit for a single window and restores a minimized one', () => {
    const { container } = renderDesktop()
    clickDock('Files')
    clickDock('Files')
    const [files] = windowsOf(container, 'files')
    expect(files.hidden).toBe(true)

    rightClickDock('Files')
    expect(menuLabels()).toEqual(['Home', 'New Window', 'App Details', 'Quit'])
    chooseMenuItem('Home')

    expect(files.hidden).toBe(false)
    expect(files.className).not.toContain('backdrop')
  })

  it('focuses a window that is behind another', () => {
    const { container } = renderDesktop()
    clickDock('Files')
    clickDock('Terminal')

    rightClickDock('Files')
    chooseMenuItem('Home')

    expect(windowsOf(container, 'files')[0].className).not.toContain('backdrop')
  })
})
