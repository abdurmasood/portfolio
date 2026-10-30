// @vitest-environment jsdom
// Appearance is saved per visitor and the style follows the OS until it's picked; the rest resets on reload
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, dock, memoryStorage, quotaError, refusingWrites, renderDesktop, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { announceWrite } from '@/tests/home/helpers/homeStore'
import { SETTINGS_KEY, createSettingsStore } from '@/components/rafeyos/core/settings/settingsStore'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

const root = (container) => container.querySelector('.rafeyos')
const accent = (container) => root(container).style.getPropertyValue('--accent')

/** rafeyOS on `disk`, as each page load builds a fresh store over the same localStorage. */
const loadDesktop = (disk, overrides = {}) => renderDesktop({ settings: createSettingsStore({ storage: disk }), ...overrides })

const reload = (disk, overrides) => {
  cleanup()
  return loadDesktop(disk, overrides)
}

const openSettings = (container) => {
  clickDock('Settings')
  const ui = within(windowsOf(container, 'settings')[0])
  return { ui, go: (name) => fireEvent.click(ui.getByRole('button', { name })) }
}

const openQuickSettings = () => {
  fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
  return within(screen.getByRole('dialog', { name: 'Quick settings' }))
}
const tile = (qs, title) => qs.getAllByRole('button').find((button) => button.querySelector('b')?.textContent === title)

/** The visitor's OS colour scheme, which tests can flip as the visitor's system would. */
const fakeOs = (dark) => {
  const listeners = new Set()
  const os = {
    prefersDark: () => dark,
    watchColorScheme: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  const change = (next) =>
    act(() => {
      dark = next
      listeners.forEach((listener) => listener())
    })
  return { os, change, listening: () => listeners.size }
}

describe('saved settings', () => {
  it('keeps the accent, wallpaper, dock and icon size across a reload', () => {
    const disk = memoryStorage()
    const first = loadDesktop(disk)
    const { ui, go } = openSettings(first.container)
    fireEvent.click(ui.getByRole('button', { name: 'Blue' }))
    fireEvent.click(ui.getByRole('button', { name: 'Graphite' }))
    go('Ubuntu Desktop')
    fireEvent.click(ui.getByRole('button', { name: 'Right' }))
    fireEvent.change(ui.getByRole('slider', { name: 'Icon size' }), { target: { value: '56' } })

    const { container } = reload(disk)

    expect(accent(container)).toBe('#0073E5')
    expect(screen.getByTestId('wallpaper').dataset.wall).toBe('Graphite')
    expect(dock().className).toBe('dock right')
    expect(root(container).style.getPropertyValue('--icon')).toBe('56px')
  })

  it('resets Wi-Fi, volume, Do Not Disturb, Night Light and Bluetooth on reload', () => {
    const disk = memoryStorage()
    loadDesktop(disk)
    const qs = openQuickSettings()
    fireEvent.click(tile(qs, 'Wi-Fi'))
    fireEvent.click(tile(qs, 'Night Light'))
    fireEvent.click(tile(qs, 'Bluetooth'))
    fireEvent.change(qs.getByRole('slider', { name: 'Volume' }), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Date and time' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Do Not Disturb' }))
    expect(disk.getItem(SETTINGS_KEY)).toBeNull()

    reload(disk)

    const fresh = openQuickSettings()
    expect(tile(fresh, 'Wi-Fi').className).toBe('qt on')
    expect(tile(fresh, 'Bluetooth').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByTestId('night-light').className).toBe('night')
    expect(fresh.getByRole('slider', { name: 'Volume' }).value).toBe('70')
    fireEvent.click(screen.getByRole('button', { name: 'Date and time' }))
    expect(screen.getByRole('switch', { name: 'Do Not Disturb' }).getAttribute('aria-checked')).toBe('false')
  })

  it('follows the OS style until one is picked, then keeps it', () => {
    const disk = memoryStorage()
    const first = loadDesktop(disk, fakeOs(false).os)
    expect(root(first.container).className).toBe('rafeyos light')

    fireEvent.click(openSettings(first.container).ui.getByRole('button', { name: 'Dark' }))
    expect(root(first.container).className).toBe('rafeyos')

    const { container } = reload(disk, fakeOs(false).os)
    expect(root(container).className).toBe('rafeyos')
  })

  it('follows an OS style change while none is picked, ignores it once one is, and stops listening on unmount', () => {
    const { os, change, listening } = fakeOs(true)
    const { container } = loadDesktop(memoryStorage(), os)

    change(false)
    expect(root(container).className).toBe('rafeyos light')
    change(true)
    expect(root(container).className).toBe('rafeyos')

    fireEvent.click(openSettings(container).ui.getByRole('button', { name: 'Default' }))
    change(true)
    expect(root(container).className).toBe('rafeyos light')

    cleanup()
    expect(listening()).toBe(0)
  })

  it('toggles the style from the OS’s, twice in one go, through Quick Settings', () => {
    const { container } = loadDesktop(memoryStorage(), fakeOs(false).os)
    const qs = openQuickSettings()

    act(() => {
      tile(qs, 'Dark Style').click()
      tile(qs, 'Dark Style').click()
    })

    expect(root(container).className).toBe('rafeyos light')
  })

  it('updates this desktop when another tab changes the accent', () => {
    const { container } = loadDesktop(window.localStorage, { settings: createSettingsStore({ storage: window.localStorage, win: window }) })
    const otherTab = createSettingsStore({ storage: window.localStorage })

    otherTab.set('accent', '#DA3450')
    announceWrite(SETTINGS_KEY)
    expect(accent(container)).toBe('#DA3450')

    window.localStorage.clear()
    announceWrite(null)
    expect(accent(container)).toBe('#E95420')
  })

  it('ignores bad saved values', () => {
    const disk = memoryStorage({ [SETTINGS_KEY]: JSON.stringify({ v: 1, values: { accent: '#123456', dockPos: 'top', wall: 3 } }) })

    const { container } = loadDesktop(disk)

    expect(accent(container)).toBe('#E95420')
    expect(dock().className).toBe('dock bottom')
    expect(screen.getByTestId('wallpaper').dataset.wall).toBe('Graphite')
  })

  it('still applies a change this session when storage is blocked or full', () => {
    for (const disk of [null, refusingWrites(memoryStorage(), quotaError())]) {
      const { container } = loadDesktop(disk)

      fireEvent.click(openSettings(container).ui.getByRole('button', { name: 'Purple' }))

      expect(accent(container)).toBe('#7764D8')
      cleanup()
    }
  })
})
