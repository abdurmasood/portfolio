import { describe, expect, it, vi } from 'vitest'
import { createMediaSession } from '@/components/rafeyos/core/services/mediaSession'

const fakeWindow = ({ setActionHandler = vi.fn(), Metadata } = {}) => {
  const session = { setActionHandler, metadata: null, playbackState: 'none' }
  return { win: { navigator: { mediaSession: session }, MediaMetadata: Metadata }, session }
}

describe('media session adapter', () => {
  it('is null without the API', () => {
    expect(createMediaSession({ navigator: {} })).toBeNull()
    expect(createMediaSession(undefined)).toBeNull()
  })

  it('sets and clears the four action handlers', () => {
    const { win, session } = fakeWindow()
    const handlers = { play: vi.fn(), pause: vi.fn(), previoustrack: vi.fn(), nexttrack: vi.fn() }

    const remove = createMediaSession(win).setHandlers(handlers)
    remove()

    const calls = session.setActionHandler.mock.calls
    expect(calls.slice(0, 4)).toEqual(Object.entries(handlers))
    expect(calls.slice(4)).toEqual(Object.keys(handlers).map((action) => [action, null]))
  })

  it('skips actions the browser does not support, and rethrows anything else', () => {
    const unsupported = fakeWindow({
      setActionHandler: vi.fn((action) => {
        if (action === 'nexttrack') throw new TypeError('unsupported')
        if (action === 'previoustrack') throw Object.assign(new Error('nope'), { name: 'NotSupportedError' })
      }),
    })
    expect(() => createMediaSession(unsupported.win).setHandlers({})).not.toThrow()

    const broken = fakeWindow({
      setActionHandler: vi.fn(() => {
        throw new Error('broken')
      }),
    })
    expect(() => createMediaSession(broken.win).setHandlers({})).toThrow('broken')
  })

  it('describes the track and the playback state', () => {
    class Metadata {
      constructor(init) {
        Object.assign(this, init)
      }
    }
    const { win, session } = fakeWindow({ Metadata })
    const media = createMediaSession(win)

    media.setMetadata({ title: 'Storms Ahead', artist: 'Rafey' })
    media.setPlaybackState(true)
    expect(session.metadata).toEqual(new Metadata({ title: 'Storms Ahead', artist: 'Rafey', album: 'rafeyOS' }))
    expect(session.playbackState).toBe('playing')
    media.setPlaybackState(false)
    expect(session.playbackState).toBe('paused')
  })

  it('leaves the metadata alone without MediaMetadata', () => {
    const { win, session } = fakeWindow()

    createMediaSession(win).setMetadata({ title: 't', artist: 'a' })

    expect(session.metadata).toBeNull()
  })
})
