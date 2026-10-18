// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, within } from '@testing-library/react'
import { clickDock, renderDesktop, windowsOf } from '@/components/rafeyos/testing/renderRafeyOS'
import { TOP_BAR_HEIGHT } from '@/components/rafeyos/wm/logic/geometry'

afterEach(cleanup)

const openFiles = () => {
  const view = renderDesktop()
  clickDock('Files')
  const [win] = windowsOf(view.container, 'files')
  return { ...view, win, header: win.querySelector('.main .hb') }
}

const px = (value) => Number.parseFloat(value)

const drag = (element, from, to) => {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: from.x, clientY: from.y })
  fireEvent.pointerMove(element, { pointerId: 1, clientX: to.x, clientY: to.y })
  fireEvent.pointerUp(element, { pointerId: 1, clientX: to.x, clientY: to.y })
}

describe('window chrome', () => {
  it('closes from the close button', () => {
    const { container, win } = openFiles()

    fireEvent.click(within(win).getByRole('button', { name: 'Close' }))

    expect(windowsOf(container, 'files')).toHaveLength(0)
  })

  it('maximizes and restores from the max button', () => {
    const { win } = openFiles()
    const before = win.style.width

    fireEvent.click(within(win).getByRole('button', { name: 'Maximize' }))
    expect(win.className).toContain('max')
    expect(px(win.style.top)).toBe(TOP_BAR_HEIGHT)

    fireEvent.click(within(win).getByRole('button', { name: 'Restore' }))
    expect(win.className).not.toContain('max')
    expect(win.style.width).toBe(before)
  })

  it('toggles maximize on a header double click, but not on its buttons', () => {
    const { win, header } = openFiles()

    fireEvent.doubleClick(within(win).getByRole('button', { name: 'Search' }))
    expect(win.className).not.toContain('max')

    fireEvent.doubleClick(header)
    expect(win.className).toContain('max')
  })

  it('minimizes from the minimize button', () => {
    const { win } = openFiles()

    fireEvent.click(within(win).getByRole('button', { name: 'Minimize' }))

    expect(win.hidden).toBe(true)
  })

  it('raises a window above the others when pressed', () => {
    const { container, win } = openFiles()
    clickDock('Terminal')
    const [terminal] = windowsOf(container, 'terminal')
    expect(Number(terminal.style.zIndex)).toBeGreaterThan(Number(win.style.zIndex))

    fireEvent.pointerDown(win)

    expect(Number(win.style.zIndex)).toBeGreaterThan(Number(terminal.style.zIndex))
  })
})

describe('window gestures', () => {
  it('moves by the pointer travel and commits once on release', () => {
    const { win, header } = openFiles()
    const left = px(win.style.left)
    const top = px(win.style.top)

    drag(header, { x: 300, y: 200 }, { x: 360, y: 240 })

    expect(px(win.style.left)).toBe(left + 60)
    expect(px(win.style.top)).toBe(top + 40)
  })

  it('ignores presses that never travel past the drag threshold', () => {
    const { win, header } = openFiles()
    const left = win.style.left

    drag(header, { x: 300, y: 200 }, { x: 302, y: 201 })

    expect(win.style.left).toBe(left)
  })

  it('maximizes when dropped on the top edge', () => {
    const { win, header } = openFiles()

    drag(header, { x: 300, y: 200 }, { x: 300, y: TOP_BAR_HEIGHT })

    expect(win.className).toContain('max')
  })

  it('pulls a maximized window free at its old size', () => {
    const { win, header } = openFiles()
    const width = win.style.width
    fireEvent.click(within(win).getByRole('button', { name: 'Maximize' }))

    drag(header, { x: 500, y: 40 }, { x: 500, y: 300 })

    expect(win.className).not.toContain('max')
    expect(win.style.width).toBe(width)
  })

  it('resizes from the bottom-right corner', () => {
    const { win } = openFiles()
    const width = px(win.style.width)
    const height = px(win.style.height)

    drag(win.querySelector('.rz.se'), { x: 800, y: 600 }, { x: 830, y: 620 })

    expect(px(win.style.width)).toBe(width + 30)
    expect(px(win.style.height)).toBe(height + 20)
  })

  it('relayouts windows when the viewport shrinks to compact', async () => {
    const { win } = openFiles()

    await act(async () => {
      window.innerWidth = 600
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolve) => setTimeout(resolve, 120))
    })

    expect(win.className).toContain('max')
    window.innerWidth = 1024
  })
})
