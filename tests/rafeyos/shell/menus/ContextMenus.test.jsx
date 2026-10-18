// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import {
  chooseMenuItem,
  desktopIcon,
  memoryStorage,
  menuEntry,
  menuLabels,
  openMenu,
  renderDesktop,
  rightClick,
  windowsOf,
} from '@/tests/rafeyos/helpers/renderRafeyOS'
import { createDocumentsStore } from '@/components/rafeyos/vfs/documents'

afterEach(cleanup)

const wallpaper = () => screen.getByTestId('wallpaper')

const desktopWithNote = () => {
  const disk = memoryStorage({
    'rafeyos-documents': JSON.stringify({ files: { '~/Desktop/note.txt': 'desk\n' }, trash: {} }),
  })
  return renderDesktop({ documents: createDocumentsStore(disk) })
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
    const disabled = ['New Folder…', 'Paste', 'Display Settings']
    disabled.forEach((name) => expect(menuEntry(name).disabled).toBe(true))
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
    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey: ~/Desktop')
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

    rightClick(desktopIcon(container, '~'))

    expect(menuLabels()).toEqual([...FILE_ACTIONS, 'Open in Terminal', 'Show in Files', 'Properties'])
    DISABLED_FILE_ACTIONS.forEach((name) => expect(menuEntry(name).disabled).toBe(true))
    expect([...container.querySelectorAll('.dicon.sel')].map((icon) => icon.dataset.path)).toEqual(['~'])
  })

  it('has no terminal entry for a file', () => {
    const { container } = desktopWithNote()

    rightClick(desktopIcon(container, '~/Desktop/note.txt'))

    expect(menuLabels()).toEqual([...FILE_ACTIONS, 'Show in Files', 'Properties'])
  })

  it('opens the icon', () => {
    const { container } = desktopWithNote()
    rightClick(desktopIcon(container, '~/Desktop/note.txt'))

    chooseMenuItem('Open')

    expect(windowsOf(container, 'editor')[0].getAttribute('aria-label')).toBe('note.txt')
  })

  it("opens a folder's terminal inside it", () => {
    const { container } = renderDesktop()
    rightClick(desktopIcon(container, '~'))

    chooseMenuItem('Open in Terminal')

    expect(windowsOf(container, 'terminal')[0].getAttribute('aria-label')).toBe('visitor@rafey: ~')
  })

  it('shows a file in Files, selected', () => {
    const { container } = desktopWithNote()
    rightClick(desktopIcon(container, '~/Desktop/note.txt'))

    chooseMenuItem('Show in Files')

    const [files] = windowsOf(container, 'files')
    expect(files.getAttribute('aria-label')).toBe('Desktop')
    expect(files.querySelector('.fbody .sel').dataset.path).toBe('~/Desktop/note.txt')
  })

  it('moves a file created on the desktop into Trash', () => {
    const disk = memoryStorage({
      'rafeyos-documents': JSON.stringify({ files: { '~/Desktop/note.txt': 'desk\n' }, trash: {} }),
    })
    const { container } = renderDesktop({ documents: createDocumentsStore(disk) })

    rightClick(desktopIcon(container, '~/Desktop/note.txt'))
    chooseMenuItem('Move to Trash')

    expect(desktopIcon(container, '~/Desktop/note.txt')).toBeNull()
    expect(JSON.parse(disk.getItem('rafeyos-documents')).trash['~/Desktop/note.txt']).toBe('desk\n')
  })
})
