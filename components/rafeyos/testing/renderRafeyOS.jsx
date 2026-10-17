// Test helpers: rafeyOS rendered with fake services (in-memory storage, navigate spy, no motion)
import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { RafeyOSRoot } from '../RafeyOSRoot'
import { SESSION_KEY } from '../session/sessionStore'

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

export const fakeServices = (overrides = {}) => ({
  navigate: vi.fn(),
  storage: memoryStorage(),
  now: () => FIXED_NOW,
  openExternal: vi.fn(),
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
