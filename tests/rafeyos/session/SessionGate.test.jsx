// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { dock, flushTimers, memoryStorage, renderDesktop, renderRafeyOS } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { SESSION_KEY } from '@/components/rafeyos/session/logic/sessionStore'
import { BOOT_MS } from '@/components/rafeyos/session/logic/useSession'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const openPowerMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
  fireEvent.click(screen.getByRole('button', { name: 'Power Off / Log Out' }))
}

describe('session', () => {
  it('shows the boot splash on a cold load, then the desktop after 1.5s', () => {
    vi.useFakeTimers()
    const { services } = renderRafeyOS({ reducedMotion: () => false })

    expect(screen.getByRole('status', { name: 'Starting rafeyOS' })).toBeTruthy()
    expect(screen.queryByRole('toolbar', { name: 'Dock' })).toBeNull()

    flushTimers(BOOT_MS)

    expect(dock()).toBeTruthy()
    expect(services.storage.getItem(SESSION_KEY)).toBe('desktop')
  })

  it('skips the boot when the splash is clicked', () => {
    renderRafeyOS({ reducedMotion: () => false })

    fireEvent.click(screen.getByRole('status', { name: 'Starting rafeyOS' }))

    expect(dock()).toBeTruthy()
  })

  it('skips the boot entirely when motion is reduced', () => {
    renderRafeyOS()

    expect(dock()).toBeTruthy()
  })

  it('goes straight to the desktop when the tab remembers the session', () => {
    renderRafeyOS({ reducedMotion: () => false, storage: memoryStorage({ [SESSION_KEY]: 'desktop' }) })

    expect(screen.queryByRole('status', { name: 'Starting rafeyOS' })).toBeNull()
    expect(dock()).toBeTruthy()
  })

  it('returns to the home terminal and forgets the session when Log Out is confirmed', () => {
    const { services } = renderDesktop()
    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Log Out…' }))
    const dialog = screen.getByRole('dialog', { name: 'Log Out' })

    expect(dialog.textContent).toContain('You will return to the rafey.ai terminal in 60 seconds.')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Log Out' }))

    expect(services.navigate).toHaveBeenCalledWith('/')
    expect(services.storage.has(SESSION_KEY)).toBe(false)
  })

  it('powers off by itself when the countdown reaches zero', () => {
    vi.useFakeTimers()
    const { services } = renderDesktop()
    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Power Off…' }))
    const dialog = screen.getByRole('dialog', { name: 'Power Off' })

    flushTimers(1000)
    expect(dialog.textContent).toContain('rafeyOS will power off and return to the terminal in 59 seconds.')

    flushTimers(59 * 1000)
    expect(services.navigate).toHaveBeenCalledTimes(1)
    expect(services.navigate).toHaveBeenCalledWith('/')
  })

  it('keeps the session when the dialog is cancelled', () => {
    const { services } = renderDesktop()
    openPowerMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Log Out…' }))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Log Out' })).toBeNull()
    expect(services.navigate).not.toHaveBeenCalled()
  })

  it('closes Quick Settings on a press outside it', () => {
    renderDesktop()
    fireEvent.click(screen.getByRole('button', { name: 'System menu' }))
    expect(screen.getByRole('dialog', { name: 'Quick settings' })).toBeTruthy()

    fireEvent.pointerDown(screen.getByTestId('wallpaper'), { button: 0 })

    expect(screen.queryByRole('dialog', { name: 'Quick settings' })).toBeNull()
  })
})
