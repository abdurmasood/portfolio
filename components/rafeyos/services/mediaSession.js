// The Media Session API (lock-screen and OS media controls, hardware media keys), behind a small
// adapter. Browsers without it get null, and callers skip it.

const ACTIONS = Object.freeze(['play', 'pause', 'previoustrack', 'nexttrack'])
const ALBUM = 'rafeyOS'

// Browsers reject actions they don't support: older ones with TypeError, some with NotSupportedError
const isUnsupportedAction = (error) => error instanceof TypeError || error?.name === 'NotSupportedError'

const setHandler = (session, action, handler) => {
  try {
    session.setActionHandler(action, handler)
  } catch (error) {
    if (!isUnsupportedAction(error)) throw error
  }
}

/**
 * @param {Window} [win]
 * @returns {{ setMetadata, setPlaybackState, setHandlers }|null}
 */
export const createMediaSession = (win = globalThis.window) => {
  const session = win?.navigator?.mediaSession
  if (!session) return null
  const Metadata = win.MediaMetadata
  return Object.freeze({
    /** @param {{ title: string, artist: string }} track */
    setMetadata: ({ title, artist }) => {
      if (typeof Metadata === 'function') session.metadata = new Metadata({ title, artist, album: ALBUM })
    },
    setPlaybackState: (playing) => {
      session.playbackState = playing ? 'playing' : 'paused'
    },
    /**
     * @param {{ play, pause, previoustrack, nexttrack }} handlers
     * @returns {() => void} removes them again
     */
    setHandlers: (handlers) => {
      ACTIONS.forEach((action) => setHandler(session, action, handlers[action] ?? null))
      return () => ACTIONS.forEach((action) => setHandler(session, action, null))
    },
  })
}
