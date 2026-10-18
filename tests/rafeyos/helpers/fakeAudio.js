// A stand-in for services/audio.js: records calls and lets a test drive time updates and the end
import { vi } from 'vitest'

export const notAllowed = () => Object.assign(new Error('play() needs a user gesture'), { name: 'NotAllowedError' })

const fakeAudio = (src) => {
  const handlers = { time: new Set(), ended: new Set(), play: new Set(), pause: new Set() }
  const subscribe = (kind) => (handler) => {
    handlers[kind].add(handler)
    return () => handlers[kind].delete(handler)
  }
  const audio = {
    src,
    time: 0,
    volume: null,
    destroyed: false,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    seek: vi.fn((seconds) => {
      audio.time = seconds
    }),
    setVolume: vi.fn((percent) => {
      audio.volume = percent
    }),
    currentTime: () => audio.time,
    duration: () => 158,
    onTime: subscribe('time'),
    onEnded: subscribe('ended'),
    onPlay: subscribe('play'),
    onPause: subscribe('pause'),
    destroy: vi.fn(() => {
      audio.destroyed = true
      Object.values(handlers).forEach((set) => set.clear())
    }),
    /** Test helpers: what the element's timeupdate and ended events would report. */
    emitTime: (seconds) => {
      audio.time = seconds
      handlers.time.forEach((handler) => handler(seconds))
    },
    emitEnded: () => handlers.ended.forEach((handler) => handler()),
    /** The element's own play/pause events, e.g. from a hardware media key. */
    emitPlay: () => handlers.play.forEach((handler) => handler()),
    emitPause: () => handlers.pause.forEach((handler) => handler()),
  }
  return audio
}

/**
 * services.createAudio for tests. `factory.last()` is the most recent adapter.
 * @param {{ refuse?: boolean }} options - refuse: play() rejects with NotAllowedError, like a blocked autoplay
 */
export const fakeAudioFactory = ({ refuse = false } = {}) => {
  const instances = []
  const factory = vi.fn((src) => {
    const audio = fakeAudio(src)
    if (refuse) audio.play.mockImplementation(() => Promise.reject(notAllowed()))
    instances.push(audio)
    return audio
  })
  factory.instances = instances
  factory.last = () => instances[instances.length - 1] ?? null
  return factory
}
