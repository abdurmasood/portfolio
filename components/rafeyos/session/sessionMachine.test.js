import { describe, it, expect } from 'vitest'
import { next, initialSessionState, SESSION_STATES, SESSION_EVENTS } from './sessionMachine'

describe('sessionMachine', () => {
  it.each([
    ['boot', 'BOOT_DONE', 'desktop'],
    ['boot', 'SKIP', 'desktop'],
    ['desktop', 'LOCK', 'lock'],
    ['lock', 'UNLOCK', 'desktop'],
    ['desktop', 'SUSPEND', 'suspended'],
    ['suspended', 'WAKE', 'desktop'],
    ['desktop', 'RESTART', 'boot'],
    ['desktop', 'LOGOUT', 'exited'],
    ['desktop', 'POWEROFF', 'exited'],
    ['lock', 'POWEROFF', 'exited'],
    ['suspended', 'LOGOUT', 'exited'],
    ['boot', 'LOGOUT', 'exited'],
  ])('%s + %s -> %s', (state, event, expected) => {
    expect(next(state, event)).toBe(expected)
  })

  it.each([
    ['boot', 'LOCK'],
    ['desktop', 'UNLOCK'],
    ['desktop', 'BOOT_DONE'],
    ['lock', 'SUSPEND'],
    ['suspended', 'UNLOCK'],
    ['exited', 'RESTART'],
    ['exited', 'BOOT_DONE'],
    ['desktop', 'NOT_AN_EVENT'],
  ])('%s ignores %s', (state, event) => {
    expect(next(state, event)).toBe(state)
  })

  it('ignores unknown states', () => {
    expect(next('mystery', 'BOOT_DONE')).toBe('mystery')
  })

  it('skips the boot only when the desktop was remembered', () => {
    expect(initialSessionState(true)).toBe(SESSION_STATES.DESKTOP)
    expect(initialSessionState(false)).toBe(SESSION_STATES.BOOT)
  })

  it('exposes every event name', () => {
    expect(Object.keys(SESSION_EVENTS)).toEqual(['BOOT_DONE', 'SKIP', 'LOCK', 'UNLOCK', 'SUSPEND', 'WAKE', 'RESTART', 'LOGOUT', 'POWEROFF'])
  })
})
