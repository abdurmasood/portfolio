// @vitest-environment jsdom
// Each Settings control changes the setting and what the desktop shows
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import {
  chooseMenuItem,
  clickDock,
  desktopIcon,
  dock,
  flushTimers,
  menuLabels,
  openPowerMenu,
  renderDesktop,
  windowsOf,
} from '../../testing/renderRafeyOS'
import { BOOT_MS } from '../../session/useSession'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom's window is 1024 × 768
const VIEWPORT_W = 1024

const openSettings = () => {
  const view = renderDesktop()
  clickDock('Settings')
  const [win] = windowsOf(view.container, 'settings')
  const ui = within(win)
  return { ...view, win, ui, go: (name) => fireEvent.click(ui.getByRole('button', { name })) }
}

const root = (container) => container.querySelector('.rafeyos')
const left = (element) => parseFloat(element.style.left)

/** A maximized Files window shows the work area as its rect. */
const maximizedFiles = (container) => {
  clickDock('Files')
  const [files] = windowsOf(container, 'files')
  fireEvent.click(within(files).getByRole('button', { name: 'Maximize' }))
  return files
}

describe('Appearance', () => {
  it('sets the accent colour on the desktop root, which everything accented reads', () => {
    const { container, ui } = openSettings()

    fireEvent.click(ui.getByRole('button', { name: 'Blue' }))

    expect(root(container).style.getPropertyValue('--accent')).toBe('#0073E5')
    expect(ui.getByRole('button', { name: 'Blue' }).className).toBe('acc on')
    expect(ui.getByRole('button', { name: 'Orange' }).className).toBe('acc')
    const previewButtons = [...container.querySelectorAll('.stc .pv i:last-child')]
    expect(previewButtons.map((i) => i.style.background)).toEqual(['rgb(0, 115, 229)', 'rgb(0, 115, 229)'])
  })

  it('switches style from the cards', () => {
    const { container, ui } = openSettings()
    const [light, dark] = container.querySelectorAll('.stc')
    expect(dark.className).toBe('stc on')

    fireEvent.click(ui.getByRole('button', { name: 'Default' }))

    expect(root(container).className).toBe('rafeyos light')
    expect(light.className).toBe('stc on')
    expect(dark.className).toBe('stc')
  })

  it('changes the wallpaper and the previews with it', () => {
    const { container, ui } = openSettings()

    fireEvent.click(ui.getByRole('button', { name: 'Graphite' }))

    expect(ui.getByRole('button', { name: 'Graphite' }).className).toBe('wl on')
    // jsdom drops gradient backgrounds, so the wallpaper's name stands in for its CSS
    expect(screen.getByTestId('wallpaper').dataset.wall).toBe('Graphite')
    expect([...container.querySelectorAll('.stc .pv')].map((pv) => pv.dataset.wall)).toEqual(['Graphite', 'Graphite'])
  })
})

describe('Ubuntu Desktop', () => {
  it('shows or hides the Home icon', () => {
    const { container, ui, go } = openSettings()
    go('Ubuntu Desktop')
    const toggle = ui.getByRole('switch', { name: 'Show Personal Folder' })

    fireEvent.click(toggle)
    expect(desktopIcon(container, '~')).toBeNull()
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(toggle)
    expect(desktopIcon(container, '~')).toBeTruthy()
  })

  it('re-lays the icons out from the chosen corner, forgetting where they were dragged', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      const x = parseFloat(this.style.left) || 0
      const y = parseFloat(this.style.top) || 0
      return { x, y, left: x, top: y, width: 90, height: 80, right: x + 90, bottom: y + 80 }
    })
    const { container, win, go } = openSettings()
    const home = () => desktopIcon(container, '~')
    const start = left(home())
    fireEvent.pointerDown(home(), { button: 0, pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(home(), { pointerId: 1, clientX: 200, clientY: 100 })
    fireEvent.pointerUp(home(), { pointerId: 1 })
    expect(left(home())).toBe(start + 200)
    go('Ubuntu Desktop')
    const dropdown = win.querySelector('.dd')

    fireEvent.click(dropdown)
    expect(menuLabels()).toEqual(['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'])
    chooseMenuItem('Top Right')
    expect(dropdown.textContent).toBe('Top Right ')
    expect(left(home())).toBeGreaterThan(VIEWPORT_W / 2)

    fireEvent.click(dropdown)
    chooseMenuItem('Top Left')
    expect(left(home())).toBe(start)
  })

  it('resizes dock icons, which narrows the work area', () => {
    const { container, ui, go } = openSettings()
    const files = maximizedFiles(container)
    expect(left(files)).toBe(54)
    go('Ubuntu Desktop')

    fireEvent.change(ui.getByRole('slider', { name: 'Icon size' }), { target: { value: '56' } })

    expect(root(container).style.getPropertyValue('--icon')).toBe('56px')
    expect(left(files)).toBe(70)
    expect(ui.getByRole('slider', { name: 'Icon size' }).step).toBe('4')
  })

  it('moves the dock to each side, and windows follow', () => {
    const { container, ui, go } = openSettings()
    const files = maximizedFiles(container)
    go('Ubuntu Desktop')

    fireEvent.click(ui.getByRole('button', { name: 'Right' }))
    expect(dock().className).toBe('dock right')
    expect(left(files)).toBe(0)
    expect(parseFloat(files.style.width)).toBe(VIEWPORT_W - 54)
    expect(ui.getByRole('button', { name: 'Right' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(ui.getByRole('button', { name: 'Bottom' }))
    expect(dock().className).toBe('dock bottom')
    expect(parseFloat(files.style.width)).toBe(VIEWPORT_W)
    expect(windowsOf(container, 'settings')[0].querySelector('.grp p')).toBeNull()
  })

  it('explains the bottom dock on small screens', () => {
    const wide = window.innerWidth
    window.innerWidth = 500
    try {
      const { win, go } = openSettings()
      go('Ubuntu Desktop')

      expect(win.querySelector('.grp p').textContent).toBe('The dock moves to the bottom on small screens.')
      expect(dock().className).toBe('dock bottom')
    } finally {
      window.innerWidth = wide
    }
  })
})

describe('settings across a restart', () => {
  it('keeps the accent, which colours the boot splash too', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderDesktop({ reducedMotion: () => false })
      clickDock('Settings')
      fireEvent.click(within(windowsOf(container, 'settings')[0]).getByRole('button', { name: 'Purple' }))

      openPowerMenu()
      fireEvent.click(screen.getByRole('button', { name: 'Restart…' }))
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Restart' })).getByRole('button', { name: 'Restart' }))

      const splash = screen.getByRole('status', { name: 'Starting rOS' })
      expect(splash.style.getPropertyValue('--accent')).toBe('#7764D8')
      flushTimers(BOOT_MS)
      expect(root(container).style.getPropertyValue('--accent')).toBe('#7764D8')
      expect(windowsOf(container, 'settings')).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
