// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import {
  chooseMenuItem,
  desktopIcon,
  fsDisk,
  fsStoreOn,
  fsTrash,
  menuEntry,
  menuLabels,
  openMenu,
  renderDesktop,
  rightClick,
  windowsOf,
} from '@/tests/rafeyos/helpers/renderRafeyOS'

afterEach(cleanup)

const wallpaper = () => screen.getByTestId('wallpaper')

const desktopWithNote = () => {
  const disk = fsDisk({ '/home/visitor/Desktop/note.txt': 'desk\n' })
  return renderDesktop({ fs: fsStoreOn(disk) })
}
const FILE_ACTIONS = ['Open', 'Open With…', 'Cut', 'Copy', 'Rename…', 'Move to Trash']
const DISABLED_FILE_ACTIONS = ['Open With…', 'Cut', 'Copy', 'Rename…', 'Move to Trash']

describe('wallpaper menu', () => {
  it('lists the mockup entries, with the unbuilt ones disabled', () => {
    renderDesktop()

    rightClick(wallpaper())

    expect(openMenu().className).toBe('pop')
    expect(menuLabels()).toEqual([
      'New Folder…', 'Paste', 'Select All', 'Show Desktop in Files', 'Open in Terminal',
      'Change Background…', 'Desktop Icons Settings', 'Display Settings',
    ])
    const disabled = ['Paste', 'Display Settings']
    disabled.forEach((name) => expect(menuEntry(name).disabled).toBe(true))
    expect(menuEntry('New Folder…').disabled).toBe(false)
  })

  it('does nothing for a disabled entry', () => {
    const { container } = renderDesktop()
    rightClick(wallpaper())

    fireEvent.click(menuEntry('Paste'))

    expect(openMenu()).toBeTruthy()
    expect(container.querySelectorAll('.win')).toHaveLength(0)
  })

  it('selects every icon', () => {
    const { container } = renderDesktop()
    rightClick(wallpaper())

    chooseMenuItem('Select All')

    expect(container.querySelectorAll('.dicon.sel')).toHaveLength(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('shows the desktop in Files and opens a terminal there', () => {
    const { container } = renderDesktop()

    rightClick(wallpaper())
    chooseMenuItem('Show Desktop in Files')
    rightClick(wallpaper())
    chooseMenuItem('Open in Terminal')

    expect(windowsOf(container, 'files')[0].getAttribute('aria-label')).toBe('Desktop')
    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey.ai: ~/Desktop')
  })

  it('closes on Escape and on a press elsewhere', () => {
    renderDesktop()

    rightClick(wallpaper())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()

    rightClick(wallpaper())
    fireEvent.pointerDown(wallpaper(), { button: 0 })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('stays open while pressed inside', () => {
    renderDesktop()
    rightClick(wallpaper())

    fireEvent.pointerDown(menuEntry('Select All'), { button: 0 })

    expect(openMenu()).toBeTruthy()
  })
})

describe('desktop icon menu', () => {
  it('offers a folder its terminal and Show in Files, and selects the icon', () => {
    const { container } = renderDesktop()

    rightClick(desktopIcon(container, '/home/visitor'))

    expect(menuLabels()).toEqual([...FILE_ACTIONS, 'Open in Terminal', 'Show in Files', 'Properties'])
    DISABLED_FILE_ACTIONS.forEach((name) => expect(menuEntry(name).disabled).toBe(true))
    expect([...container.querySelectorAll('.dicon.sel')].map((icon) => icon.dataset.path)).toEqual(['/home/visitor'])
  })

  it('has no terminal entry for a file', () => {
    const { container } = desktopWithNote()

    rightClick(desktopIcon(container, '/home/visitor/Desktop/note.txt'))

    expect(menuLabels()).toEqual([...FILE_ACTIONS, 'Show in Files', 'Properties'])
  })

  it('opens the icon', () => {
    const { container } = desktopWithNote()
    rightClick(desktopIcon(container, '/home/visitor/Desktop/note.txt'))

    chooseMenuItem('Open')

    expect(windowsOf(container, 'editor')[0].getAttribute('aria-label')).toBe('note.txt')
  })

  it("opens a folder's terminal inside it", () => {
    const { container } = renderDesktop()
    rightClick(desktopIcon(container, '/home/visitor'))

    chooseMenuItem('Open in Terminal')

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey.ai: ~')
  })

  it('shows a file in Files, selected', () => {
    const { container } = desktopWithNote()
    rightClick(desktopIcon(container, '/home/visitor/Desktop/note.txt'))

    chooseMenuItem('Show in Files')

    const [files] = windowsOf(container, 'files')
    expect(files.getAttribute('aria-label')).toBe('Desktop')
    expect(files.querySelector('.fbody .sel').dataset.path).toBe('/home/visitor/Desktop/note.txt')
  })

  it('moves a file created on the desktop into Trash', () => {
    const disk = fsDisk({ '/home/visitor/Desktop/note.txt': 'desk\n' })
    const { container } = renderDesktop({ fs: fsStoreOn(disk) })

    rightClick(desktopIcon(container, '/home/visitor/Desktop/note.txt'))
    chooseMenuItem('Move to Trash')

    expect(desktopIcon(container, '/home/visitor/Desktop/note.txt')).toBeNull()
    expect(fsTrash(disk)['/home/visitor/Desktop/note.txt']).toBe('desk\n')
  })
})
