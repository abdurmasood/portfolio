// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../lib/loadRafeyOS', () => ({ loadRafeyOS: vi.fn(() => Promise.resolve({})) }))

const { default: Terminal } = await import('./Terminal')
const { TerminalProvider } = await import('./TerminalProvider')
const { loadRafeyOS } = await import('../../lib/loadRafeyOS')

const renderTerminal = () =>
  render(
    <TerminalProvider>
      <Terminal />
    </TerminalProvider>,
  )

const run = (command) => {
  const input = screen.getByLabelText('terminal input')
  fireEvent.change(input, { target: { value: command } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

beforeEach(() => {
  push.mockClear()
  vi.mocked(loadRafeyOS).mockClear()
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('home terminal: rafeyos', () => {
  it('lists rafeyos as the last help row, and never startx', () => {
    const { container } = renderTerminal()

    run('help')

    const text = container.textContent
    expect(text).toContain('rafeyos     point-and-click version of this site')
    expect(text.indexOf('rafeyos')).toBeGreaterThan(text.indexOf('get in touch'))
    expect(text).not.toContain('startx')
  })

  it.each(['rafeyos', 'startx'])('%s prefetches, forgets the session and routes after 450ms', (command) => {
    vi.useFakeTimers()
    window.sessionStorage.setItem('rafeyos-session', 'desktop')
    const { container } = renderTerminal()

    run(command)

    expect(container.textContent).toContain('starting rafeyOS…')
    expect(loadRafeyOS).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem('rafeyos-session')).toBeNull()
    act(() => vi.advanceTimersByTime(449))
    expect(push).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(push).toHaveBeenCalledWith('/rafeyos')
  })

  it('does not route if the terminal unmounts first', () => {
    vi.useFakeTimers()
    const { unmount } = renderTerminal()
    run('rafeyos')

    unmount()
    act(() => vi.advanceTimersByTime(1000))

    expect(push).not.toHaveBeenCalled()
  })

  it('completes "raf" to rafeyos with Tab', () => {
    renderTerminal()
    const input = screen.getByLabelText('terminal input')
    run('help')

    fireEvent.change(input, { target: { value: 'raf' } })
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(input.value).toBe('rafeyos')
  })
})
