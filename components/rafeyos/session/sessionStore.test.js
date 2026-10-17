import { describe, it, expect } from 'vitest'
import { rememberDesktop, forgetDesktop, isDesktopRemembered, SESSION_KEY } from './sessionStore'

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
