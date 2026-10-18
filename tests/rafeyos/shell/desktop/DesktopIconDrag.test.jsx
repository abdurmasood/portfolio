// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { desktopIcon, memoryStorage, renderDesktop, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { createDocumentsStore } from '@/components/rafeyos/core/vfs/documents'

// jsdom has no layout: give icons the box their inline position implies
const ICON_BOX = { w: 90, h: 80 }
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
    const x = parseFloat(this.style.left) || 0
    const y = parseFloat(this.style.top) || 0
    return { x, y, left: x, top: y, width: ICON_BOX.w, height: ICON_BOX.h, right: x + ICON_BOX.w, bottom: y + ICON_BOX.h }
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const at = (element) => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top) })

const desktopWithNote = () => {
  const disk = memoryStorage({
    'rafeyos-documents': JSON.stringify({ files: { '~/Desktop/note.txt': 'desk\n' }, trash: {} }),
  })
  return renderDesktop({ documents: createDocumentsStore(disk) })
}

const drag = (element, from, to, options = {}) => {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: from.x, clientY: from.y, ...options })
  fireEvent.pointerMove(element, { pointerId: 1, clientX: to.x, clientY: to.y })
  fireEvent.pointerUp(element, { pointerId: 1 })
}

describe('desktop icon drag', () => {
  it('moves an icon and commits where it was dropped', () => {
    const { container } = renderDesktop()
    const home = desktopIcon(container, '~')
    const start = at(home)

    drag(home, { x: 100, y: 60 }, { x: 150, y: 100 })
    expect(at(home)).toEqual({ x: start.x + 50, y: start.y + 40 })

    // The second drag starts from the committed position, not the layout's
    drag(home, { x: 0, y: 0 }, { x: 10, y: 10 })
    expect(at(home)).toEqual({ x: start.x + 60, y: start.y + 50 })
  })

  it('moves the whole selection together', () => {
    const { container } = desktopWithNote()
    const home = desktopIcon(container, '~')
    const note = desktopIcon(container, '~/Desktop/note.txt')
    const noteStart = at(note)
    fireEvent.pointerDown(home, { button: 0 })
    fireEvent.pointerUp(home)

    drag(note, { x: 0, y: 0 }, { x: 20, y: 30 }, { ctrlKey: true })

    expect(at(note)).toEqual({ x: noteStart.x + 20, y: noteStart.y + 30 })
    expect(container.querySelectorAll('.dicon.sel')).toHaveLength(2)
  })

  it('ignores jitter below the drag threshold', () => {
    const { container } = renderDesktop()
    const home = desktopIcon(container, '~')
    const start = at(home)

    drag(home, { x: 100, y: 60 }, { x: 102, y: 61 })

    expect(at(home)).toEqual(start)
  })

  it('still opens on a touch tap, but not after a touch drag', () => {
    const { container } = renderDesktop()
    const home = desktopIcon(container, '~')

    drag(home, { x: 0, y: 0 }, { x: 40, y: 40 }, { pointerType: 'touch' })
    fireEvent.click(home)
    expect(windowsOf(container, 'files')).toHaveLength(0)

    fireEvent.pointerDown(home, { button: 0, pointerType: 'touch' })
    fireEvent.pointerUp(home)
    fireEvent.click(home)
    expect(windowsOf(container, 'files')).toHaveLength(1)
  })

  it('toggles an icon out of the selection with Shift, without dragging it', () => {
    const { container } = renderDesktop()
    const home = desktopIcon(container, '~')
    const start = at(home)
    fireEvent.pointerDown(home, { button: 0 })
    fireEvent.pointerUp(home)

    drag(home, { x: 0, y: 0 }, { x: 40, y: 40 }, { shiftKey: true })

    expect(home.className).not.toContain('sel')
    expect(at(home)).toEqual(start)
  })
})

describe('rubber band', () => {
  it('selects the icons it touches and hides when released', async () => {
    const { container } = desktopWithNote()
    const band = container.querySelector('.rubber')
    const wall = screen.getByTestId('wallpaper')

    fireEvent.pointerDown(wall, { button: 0, pointerId: 1, clientX: 200, clientY: 150 })
    fireEvent.pointerMove(wall, { pointerId: 1, clientX: 0, clientY: 0 })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))

    expect(band.hidden).toBe(false)
    expect(band.style.width).toBe('200px')
    expect([...container.querySelectorAll('.dicon.sel')].map((icon) => icon.dataset.path)).toEqual(['~', '~/Desktop/note.txt'])

    fireEvent.pointerUp(wall, { pointerId: 1 })
    expect(band.hidden).toBe(true)
    expect(container.querySelectorAll('.dicon.sel')).toHaveLength(2)
  })

  it('starts each band from an empty selection', () => {
    const { container } = renderDesktop()
    fireEvent.pointerDown(desktopIcon(container, '~'), { button: 0 })
    const wall = screen.getByTestId('wallpaper')

    fireEvent.pointerDown(wall, { button: 0, pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(wall, { pointerId: 1, clientX: 5, clientY: 5 })
    fireEvent.pointerUp(wall, { pointerId: 1 })

    expect(container.querySelectorAll('.dicon.sel')).toHaveLength(0)
  })
})
