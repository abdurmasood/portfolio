import { describe, expect, it, vi } from 'vitest'
import { createServices } from './createServices'
import { sessionStorageOrNull } from './browserStorage'

const fakeWindow = (overrides = {}) => ({
  sessionStorage: { getItem: () => null },
  open: vi.fn(),
  matchMedia: vi.fn((query) => ({ matches: query.includes('reduce') })),
  ...overrides,
})

describe('services', () => {
  it('routes, opens external links without an opener, and reads media queries', () => {
    const router = { push: vi.fn() }
    const win = fakeWindow()
    const services = createServices({ router, win })

    services.navigate('/')
    services.openExternal('https://x')

    expect(router.push).toHaveBeenCalledWith('/')
    expect(win.open).toHaveBeenCalledWith('https://x', '_blank', 'noopener,noreferrer')
    expect(services.reducedMotion()).toBe(true)
    expect(services.prefersDark()).toBe(false)
    expect(services.now()).toBeInstanceOf(Date)
    expect(services.storage).toBe(win.sessionStorage)
  })

  it('copies through the window clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    const services = createServices({ router: { push: vi.fn() }, win: fakeWindow({ navigator: { clipboard: { writeText } } }) })

    await services.clipboard.writeText('hi')

    expect(writeText).toHaveBeenCalledWith('hi')
  })

  it('builds audio from the window Audio constructor', () => {
    const Audio = vi.fn(function FakeAudio(src) {
      this.src = src
    })
    const services = createServices({ router: { push: vi.fn() }, win: fakeWindow({ Audio }) })

    services.createAudio('/song.mp3')

    expect(Audio).toHaveBeenCalledWith('/song.mp3')
  })

  it('falls back when matchMedia is missing', () => {
    const services = createServices({ router: { push: vi.fn() }, win: fakeWindow({ matchMedia: undefined }) })

    expect(services.reducedMotion()).toBe(false)
    expect(services.prefersDark()).toBe(true)
  })
})

describe('sessionStorageOrNull', () => {
  it('returns null when reading sessionStorage throws', () => {
    const blocked = Object.defineProperty({}, 'sessionStorage', {
      get: () => {
        throw new Error('SecurityError')
      },
    })

    expect(sessionStorageOrNull(blocked)).toBeNull()
    expect(sessionStorageOrNull(undefined)).toBeNull()
  })
})
