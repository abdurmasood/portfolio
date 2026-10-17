// Test helpers: rafeyOS rendered with fake services (in-memory storage, navigate spy, fake audio, no motion)
import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { RafeyOSRoot } from '../RafeyOSRoot'
import { SESSION_KEY } from '../session/sessionStore'
import { fakeAudioFactory } from './fakeAudio'
import { createDocumentsStore } from '../vfs/documents'

export const memoryStorage = (entries = {}) => {
  const map = new Map(Object.entries(entries))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    has: (key) => map.has(key),
  }
}

// 17 Oct 2026, 21:04 local time
export const FIXED_NOW = new Date(2026, 9, 17, 21, 4)

// A rising ramp, so the waveform's bars get taller from left to right
export const FAKE_SAMPLES = Float32Array.from({ length: 4800 }, (_, i) => i / 4800)

export const fakeServices = (overrides = {}) => ({
  navigate: vi.fn(),
  storage: memoryStorage(),
  documents: createDocumentsStore(memoryStorage()),
  now: () => FIXED_NOW,
  openExternal: vi.fn(),
  clipboard: { writeText: vi.fn(() => Promise.resolve()) },
  createAudio: fakeAudioFactory(),
  loadAudioSamples: () => Promise.resolve(FAKE_SAMPLES),
  mediaSession: null,
  reducedMotion: () => true,
  prefersDark: () => true,
  ...overrides,
})

/** Renders in StrictMode, so double-run effects are exercised too. */
export const renderRafeyOS = (overrides = {}) => {
  const services = fakeServices(overrides)
  const view = render(
    <StrictMode>
      <RafeyOSRoot services={services} />
    </StrictMode>,
  )
  return { services, ...view }
}

/** Straight to the desktop: the session is remembered, as after a refresh. */
export const renderDesktop = (overrides = {}) =>
  renderRafeyOS({ storage: memoryStorage({ [SESSION_KEY]: 'desktop' }), ...overrides })

export const dock = () => screen.getByRole('toolbar', { name: 'Dock' })

export const clickDock = (name) => fireEvent.click(within(dock()).getByRole('button', { name }))

export const windowsOf = (container, appId) => [...container.querySelectorAll(`.win[data-app="${appId}"]`)]

export const openTerminal = (container) => {
  clickDock('Terminal')
  const [win] = windowsOf(container, 'terminal')
  return { win, input: within(win).getByLabelText('Terminal input') }
}

export const typeCommand = (input, command) => {
  fireEvent.change(input, { target: { value: command } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

export const flushTimers = (ms) => act(() => vi.advanceTimersByTime(ms))

/** Lets pending promises settle (e.g. audio play()) and React apply what they dispatched. */
export const settle = () => act(async () => {})

/** Right-click, as a mouse would at (200, 200). */
export const rightClick = (element, point = { clientX: 200, clientY: 200 }) => fireEvent.contextMenu(element, point)

export const openMenu = () => screen.getByRole('menu')

/** The open menu's entries (separators and headings aside), as their labels. Choice items count too. */
export const menuLabels = () =>
  [...openMenu().querySelectorAll('[role="menuitem"], [role="menuitemradio"]')].map((entry) => entry.textContent)

export const menuEntry = (name) =>
  within(openMenu()).queryByRole('menuitem', { name }) ?? within(openMenu()).getByRole('menuitemradio', { name })

export const chooseMenuItem = (name) => fireEvent.click(menuEntry(name))

export const desktopIcon = (container, path) => container.querySelector(`.dicon[data-path="${path}"]`)

export const openPowerMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Power Off / Log Out' }))
}

/** The title shown in a window's header bar (it can differ from the window title, e.g. the editor's "• "). */
export const headerTitle = (win) => win.querySelector('.hb .ttl b').textContent
