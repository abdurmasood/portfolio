import { describe, expect, it, vi } from 'vitest'
import { dockMenuItems, dockMenuPlacement, fileMenuItems, wallMenuItems } from '@/components/rafeyos/ui/menus/logic/menus'
import { MENU_ITEM_KINDS, SEPARATOR, disabledItem, menuHeading, menuItem } from '@/components/rafeyos/ui/menus/logic/menuItems'
import { pathCommands } from '@/components/rafeyos/ui/menus/logic/pathCommands'
import { bandRect, passedThreshold, pathsInBand, rectsTouch, sameSelection } from '@/components/rafeyos/shell/desktop/logic/rubberBand'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'

const labels = (items) => items.filter((item) => item.kind === MENU_ITEM_KINDS.ITEM).map((item) => item.label)

describe('menu items', () => {
  it('disables entries without an action', () => {
    expect(menuItem('Go', () => {})).toMatchObject({ kind: 'item', label: 'Go', disabled: false })
    expect(disabledItem('Nope')).toMatchObject({ kind: 'item', action: null, disabled: true })
    expect(menuHeading('Head')).toEqual({ kind: 'heading', label: 'Head' })
    expect(SEPARATOR.kind).toBe('separator')
  })
})

describe('file and wall menus', () => {
  const commands = { open: vi.fn(), openTerminal: vi.fn(), showInFiles: vi.fn(), properties: vi.fn() }

  it('adds the terminal for folders and Show in Files on the desktop', () => {
    expect(labels(fileMenuItems({ commands, isFolder: true, onDesktop: false }))).toContain('Open in Terminal')
    expect(labels(fileMenuItems({ commands, isFolder: false, onDesktop: true }))).toContain('Show in Files')
    expect(labels(fileMenuItems({ commands, isFolder: false, onDesktop: false }))).not.toContain('Show in Files')
  })

  it('trashes a created file and restores a trashed one', () => {
    const trash = vi.fn()
    const restore = vi.fn()
    const live = fileMenuItems({ commands: { ...commands, trash }, isFolder: false, onDesktop: false })
    const gone = fileMenuItems({ commands: { ...commands, restore }, isFolder: false, onDesktop: false })

    expect(live.find((item) => item.label === 'Move to Trash').disabled).toBe(false)
    expect(labels(gone)).toContain('Restore')
    expect(labels(gone)).not.toContain('Move to Trash')
    live.find((item) => item.label === 'Move to Trash').action()
    gone.find((item) => item.label === 'Restore').action()

    expect(trash).toHaveBeenCalled()
    expect(restore).toHaveBeenCalled()
    expect(fileMenuItems({ commands, isFolder: false, onDesktop: false }).find((item) => item.label === 'Move to Trash').disabled).toBe(true)
  })

  it('wires the wall actions', () => {
    const actions = { selectAll: vi.fn(), showDesktop: vi.fn(), openTerminal: vi.fn(), changeBackground: vi.fn(), iconSettings: vi.fn() }
    const items = wallMenuItems(actions)
    const choose = (label) => items.find((item) => item.label === label).action()

    choose('Open in Terminal')
    choose('Change Background…')
    choose('Desktop Icons Settings')

    expect(actions.openTerminal).toHaveBeenCalled()
    expect(actions.changeBackground).toHaveBeenCalled()
    expect(actions.iconSettings).toHaveBeenCalled()
    expect(items.find((item) => item.label === 'Display Settings').disabled).toBe(true)
  })
})

describe('dock menu', () => {
  const windows = [{ id: 1, title: 'Home' }, { id: 2, title: 'blog' }]

  it('lists windows, then New Window, App Details and Quit', () => {
    const show = vi.fn()
    const items = dockMenuItems({ windows, show, newWindow: vi.fn(), quit: vi.fn() })

    expect(labels(items)).toEqual(['Home', 'blog', 'New Window', 'App Details', 'Quit 2 Windows'])
    items[1].action()
    expect(show).toHaveBeenCalledWith(windows[1])
  })

  it('opens beside a side dock and above a bottom one', () => {
    const rect = { x: 4, y: 100, w: 46, h: 46 }

    expect(dockMenuPlacement(rect, 'left')).toEqual({ point: { x: 58, y: 100 }, anchorBottom: false })
    expect(dockMenuPlacement({ ...rect, x: 970 }, 'right')).toEqual({ point: { x: 770, y: 100 }, anchorBottom: false })
    expect(dockMenuPlacement({ ...rect, y: 720 }, 'bottom')).toEqual({ point: { x: 4, y: 710 }, anchorBottom: true })
  })
})

describe('path commands', () => {
  const setup = (path) => {
    const windowManager = { openApp: vi.fn() }
    const openPath = vi.fn()
    return { windowManager, openPath, commands: pathCommands({ vfs: realVfs, windowManager, openPath }, path) }
  }

  it('opens files and folders through the injected opener', () => {
    const { openPath, commands } = setup('/home/rafey/bio.txt')

    commands.open()

    expect(openPath).toHaveBeenCalledWith('/home/rafey/bio.txt')
  })

  it("opens a file's terminal in its folder and a folder's inside it", () => {
    const file = setup('/home/rafey/blog/x.md')
    file.commands.openTerminal()
    const folder = setup('/home/rafey/projects')
    folder.commands.openTerminal()

    expect(file.windowManager.openApp).toHaveBeenCalledWith('terminal', { path: '/home/rafey/blog' })
    expect(folder.windowManager.openApp).toHaveBeenCalledWith('terminal', { path: '/home/rafey/projects' })
  })

  it('shows the file selected in its folder, and Home selected in /home', () => {
    const file = setup('/home/rafey/bio.txt')
    file.commands.showInFiles()
    const home = setup('/home/visitor')
    home.commands.showInFiles()

    expect(file.windowManager.openApp).toHaveBeenCalledWith('files', { path: '/home/rafey', init: { select: '/home/rafey/bio.txt' } })
    expect(home.windowManager.openApp).toHaveBeenCalledWith('files', { path: '/home', init: { select: '/home/visitor' } })
  })

  it('opens Properties on the path it was given', () => {
    const { windowManager, commands } = setup('/home/rafey/bio.txt')

    commands.properties()

    expect(windowManager.openApp).toHaveBeenCalledWith('properties', { path: '/home/rafey/bio.txt' })
  })
})

describe('rubber band geometry', () => {
  it('spans the two points in any direction', () => {
    expect(bandRect({ x: 50, y: 40 }, { x: 10, y: 60 })).toEqual({ x: 10, y: 40, w: 40, h: 20 })
  })

  it('counts touching edges', () => {
    const band = { x: 0, y: 0, w: 10, h: 10 }

    expect(rectsTouch(band, { x: 10, y: 10, w: 5, h: 5 })).toBe(true)
    expect(rectsTouch(band, { x: 11, y: 0, w: 5, h: 5 })).toBe(false)
    expect(rectsTouch(band, { x: 0, y: -6, w: 5, h: 5 })).toBe(false)
    expect(pathsInBand(band, [{ path: 'a', rect: { x: 5, y: 5, w: 1, h: 1 } }, { path: 'b', rect: { x: 50, y: 5, w: 1, h: 1 } }])).toEqual(['a'])
  })

  it('needs 5px before a press becomes a drag, and compares selections in order', () => {
    expect(passedThreshold({ x: 3, y: 3 })).toBe(false)
    expect(passedThreshold({ x: 3, y: 4 })).toBe(true)
    expect(sameSelection(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameSelection(['a'], ['b'])).toBe(false)
    expect(sameSelection(['a'], ['a', 'b'])).toBe(false)
  })
})
