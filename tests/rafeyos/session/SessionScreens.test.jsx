// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, dock, flushTimers, memoryStorage, openPowerMenu, renderDesktop, windowsOf } from '@/components/rafeyos/testing/renderRafeyOS'
import { SESSION_KEY } from '@/components/rafeyos/session/logic/sessionStore'
import { BOOT_MS } from '@/components/rafeyos/session/logic/useSession'
import { UNLOCK_KEY_DELAY_MS } from '@/components/rafeyos/session/SessionScreens'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const lock = () => {
  fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
}

const withWindows = (overrides) => {
  const view = renderDesktop(overrides)
  clickDock('Files')
  clickDock('Terminal')
  return view
}

describe('lock screen', () => {
  it('shows the clock, the date and the hint over the blurred wallpaper', () => {
    const { container } = withWindows()

    lock()

    const screenEl = screen.getByRole('dialog', { name: 'Locked' })
    expect(screenEl.querySelector('.lockbg').style.background).not.toBe('')
    expect(screenEl.querySelector('.lockclk .t').textContent).toBe('21:04')
    expect(screenEl.querySelector('.lockclk .d').textContent).toBe('Saturday, October 17')
    expect(screenEl.querySelector('.topbar').textContent).toContain('Oct 17  21:04')
    expect(within(screenEl).getByText('Click or press a key to unlock')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Quick settings' })).toBeNull()
    expect(container.querySelectorAll('.win')).toHaveLength(2)
  })

  it('unlocks on a click with every window kept', () => {
    const { container } = withWindows()
    const before = [...container.querySelectorAll('.win')]
    lock()

    fireEvent.click(screen.getByRole('dialog', { name: 'Locked' }))

    expect(screen.queryByRole('dialog', { name: 'Locked' })).toBeNull()
    expect([...container.querySelectorAll('.win')]).toEqual(before)
  })

  it('unlocks on a key press once the locking press has passed', () => {
    vi.useFakeTimers()
    const { container } = withWindows()
    lock()

    fireEvent.keyDown(window, { key: 'a' })
    expect(screen.getByRole('dialog', { name: 'Locked' })).toBeTruthy()

    flushTimers(UNLOCK_KEY_DELAY_MS)
    fireEvent.keyDown(window, { key: 'a' })
    expect(screen.queryByRole('dialog', { name: 'Locked' })).toBeNull()
    expect(windowsOf(container, 'terminal')).toHaveLength(1)
  })
})

describe('suspend', () => {
  it('goes black until clicked, then wakes to the same desktop', () => {
    const { container, services } = withWindows()
    openPowerMenu()

    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }))
    const suspended = screen.getByRole('dialog', { name: 'Suspended' })
    expect(suspended.textContent).toBe('Suspended. Click to wake.')

    fireEvent.click(suspended)
    expect(screen.queryByRole('dialog', { name: 'Suspended' })).toBeNull()
    expect(container.querySelectorAll('.win')).toHaveLength(2)
    expect(services.navigate).not.toHaveBeenCalled()
  })
})

describe('restart', () => {
  const restartFromDialog = () => {
    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Restart…' }))
    return screen.getByRole('dialog', { name: 'Restart' })
  }

  it('counts down, then closes every window and replays the boot without leaving', () => {
    vi.useFakeTimers()
    const storage = memoryStorage({ [SESSION_KEY]: 'desktop' })
    const { container, services } = withWindows({ reducedMotion: () => false, storage })
    const dialog = restartFromDialog()

    expect(dialog.textContent).toContain('The system will restart automatically in 60 seconds.')
    flushTimers(1000)
    expect(dialog.textContent).toContain('The system will restart automatically in 59 seconds.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restart' }))

    expect(screen.getByRole('status', { name: 'Starting rafeyOS' })).toBeTruthy()
    expect(storage.has(SESSION_KEY)).toBe(false)
    flushTimers(BOOT_MS)
    expect(dock()).toBeTruthy()
    expect(container.querySelectorAll('.win')).toHaveLength(0)
    expect(storage.getItem(SESSION_KEY)).toBe('desktop')
    expect(services.navigate).not.toHaveBeenCalled()
  })

  it('restarts by itself when the countdown runs out, and Cancel keeps the desktop', () => {
    vi.useFakeTimers()
    const { container } = withWindows()

    restartFromDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(container.querySelectorAll('.win')).toHaveLength(2)

    restartFromDialog()
    flushTimers(60 * 1000)
    expect(container.querySelectorAll('.win')).toHaveLength(0)
    expect(dock()).toBeTruthy()
  })

  it('is offered between Cancel and Power Off in the Power Off dialog', () => {
    const { container, services } = withWindows()
    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Power Off…' }))
    const dialog = screen.getByRole('dialog', { name: 'Power Off' })

    expect(within(dialog).getAllByRole('button').map((button) => button.textContent)).toEqual(['Cancel', 'Restart', 'Power Off'])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restart' }))

    expect(container.querySelectorAll('.win')).toHaveLength(0)
    expect(services.navigate).not.toHaveBeenCalled()
  })
})

describe('quick settings', () => {
  it('keeps Screenshot disabled and opens Settings on Appearance', () => {
    const { container } = renderDesktop()
    fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
    const quickSettings = within(screen.getByRole('dialog', { name: 'Quick settings' }))

    expect(quickSettings.getByRole('button', { name: 'Take Screenshot' }).disabled).toBe(true)
    fireEvent.click(quickSettings.getByRole('button', { name: 'Settings' }))

    expect(windowsOf(container, 'settings')[0].getAttribute('aria-label')).toBe('Appearance')
    expect(screen.queryByRole('dialog', { name: 'Quick settings' })).toBeNull()
  })
})
