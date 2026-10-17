// A thin adapter over HTMLAudioElement, so the music player never touches the DOM API directly
// and tests can pass a fake with the same shape.

const VOLUME_MAX = 100

const clampVolume = (percent) => Math.min(VOLUME_MAX, Math.max(0, percent)) / VOLUME_MAX

/** Adds a listener and returns its removal. */
const listen = (element, type, handler) => {
  element.addEventListener(type, handler)
  return () => element.removeEventListener(type, handler)
}

/**
 * @param {string} src - the track URL
 * @param {typeof Audio} [AudioElement] - the constructor; the browser's by default
 * @returns {{ play: () => Promise<void>, pause, seek, setVolume, currentTime, duration, onEnded, onTime,
 *   onPlay, onPause, destroy }} - onPlay/onPause follow the element itself, so pauses from outside
 *   (hardware media keys, the browser's own media controls) reach the player too
 */
export const createAudio = (src, AudioElement = globalThis.Audio) => {
  const element = new AudioElement(src)
  // Nothing downloads until the first play
  element.preload = 'none'
  const removals = new Set()
  const subscribe = (type, handler) => {
    const remove = listen(element, type, handler)
    removals.add(remove)
    return () => {
      remove()
      removals.delete(remove)
    }
  }
  return Object.freeze({
    // Browsers may reject (autoplay policy) or, in old ones, return nothing; callers always get a promise
    play: () => {
      try {
        return Promise.resolve(element.play())
      } catch (error) {
        return Promise.reject(error)
      }
    },
    pause: () => element.pause(),
    seek: (seconds) => {
      element.currentTime = seconds
    },
    setVolume: (percent) => {
      element.volume = clampVolume(percent)
    },
    currentTime: () => element.currentTime,
    duration: () => element.duration,
    onEnded: (handler) => subscribe('ended', handler),
    onTime: (handler) => subscribe('timeupdate', () => handler(element.currentTime)),
    onPlay: (handler) => subscribe('play', handler),
    onPause: (handler) => subscribe('pause', handler),
    /** Stops playback, drops every listener and releases the download. */
    destroy: () => {
      element.pause()
      removals.forEach((remove) => remove())
      removals.clear()
      element.removeAttribute('src')
      element.load()
    },
  })
}
