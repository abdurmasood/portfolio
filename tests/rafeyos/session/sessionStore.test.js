import { describe, it, expect } from 'vitest'
import {
  rememberDesktop,
  forgetDesktop,
  isDesktopRemembered,
  rememberHandoff,
  takeHandoff,
  HANDOFF_KEY,
  SESSION_KEY,
} from '@/components/rafeyos/session/logic/sessionStore'

const memoryStorage = () => {
  const items = new Map()
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    items,
  }
}

const throwingStorage = {
  getItem: () => { throw new Error('SecurityError') },
  setItem: () => { throw new Error('QuotaExceededError') },
  removeItem: () => { throw new Error('SecurityError') },
}

describe('sessionStore', () => {
  it('remembers and forgets the desktop under rafeyos-session', () => {
    const storage = memoryStorage()

    rememberDesktop(storage)
    const remembered = isDesktopRemembered(storage)
    forgetDesktop(storage)

    expect(SESSION_KEY).toBe('rafeyos-session')
    expect(remembered).toBe(true)
    expect(isDesktopRemembered(storage)).toBe(false)
  })

  it('stores the desktop marker value', () => {
    const storage = memoryStorage()

    rememberDesktop(storage)

    expect(storage.items.get('rafeyos-session')).toBe('desktop')
  })

  it('does not treat other values as remembered', () => {
    const storage = memoryStorage()
    storage.setItem(SESSION_KEY, 'home')

    expect(isDesktopRemembered(storage)).toBe(false)
  })

  it('is safe with a storage that throws', () => {
    expect(() => rememberDesktop(throwingStorage)).not.toThrow()
    expect(() => forgetDesktop(throwingStorage)).not.toThrow()
    expect(isDesktopRemembered(throwingStorage)).toBe(false)
  })

  it('is safe with no storage at all', () => {
    expect(() => rememberDesktop(null)).not.toThrow()
    expect(() => forgetDesktop(undefined)).not.toThrow()
    expect(isDesktopRemembered(null)).toBe(false)
  })
})

describe('hand-off store', () => {
  it('keeps the window to open under rafeyos-handoff, and reading it clears it', () => {
    const storage = memoryStorage()

    rememberHandoff(storage, { app: 'files', path: '/home/visitor' })
    const stored = storage.items.get('rafeyos-handoff')
    const taken = takeHandoff(storage)

    expect(HANDOFF_KEY).toBe('rafeyos-handoff')
    expect(JSON.parse(stored)).toEqual({ app: 'files', path: '/home/visitor' })
    expect(taken).toEqual({ app: 'files', path: '/home/visitor' })
    expect(takeHandoff(storage)).toBeNull()
  })

  it('clears an old hand-off when there is no window to open', () => {
    const storage = memoryStorage()
    rememberHandoff(storage, { path: '/home/rafey/bio.txt' })

    rememberHandoff(storage, undefined)

    expect(storage.items.has(HANDOFF_KEY)).toBe(false)
  })

  it.each([
    ['not JSON', '{'],
    ['not an object', '"files"'],
    ['a path that is not a string', JSON.stringify({ path: 3 })],
    ['an app that is not a string', JSON.stringify({ app: ['files'], path: '/home/visitor' })],
    ['naming neither an app nor a path', JSON.stringify({})],
  ])('ignores and clears a stored value that is %s', (_label, value) => {
    const storage = memoryStorage()
    storage.setItem(HANDOFF_KEY, value)

    expect(takeHandoff(storage)).toBeNull()
    expect(storage.items.has(HANDOFF_KEY)).toBe(false)
  })

  it('is safe with a storage that throws, or none', () => {
    expect(() => rememberHandoff(throwingStorage, { path: '/home/visitor' })).not.toThrow()
    expect(takeHandoff(throwingStorage)).toBeNull()
    expect(() => rememberHandoff(null, { path: '/home/visitor' })).not.toThrow()
    expect(takeHandoff(undefined)).toBeNull()
  })
})
