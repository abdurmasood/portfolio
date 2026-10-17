// Playback state for the one track. `played` turns on with the first play that actually starts
// (a blocked autoplay doesn't count), and shows the media card and the track's speaker icon.

export const initialMusic = Object.freeze({ playing: false, position: 0, played: false })

/** Whole seconds: the element reports several updates a second, but the UI only shows seconds. */
const toSeconds = (seconds) => (Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0)

const merge = (state, changes) =>
  Object.keys(changes).every((key) => state[key] === changes[key]) ? state : { ...state, ...changes }

const HANDLERS = Object.freeze({
  // Optimistic, so the button flips at once; `blocked` reverts it if the browser refuses
  request: (state) => merge(state, { playing: true }),
  started: (state) => merge(state, { playing: true, played: true }),
  blocked: (state) => merge(state, { playing: false }),
  pause: (state) => merge(state, { playing: false }),
  time: (state, { position }) => merge(state, { position: toSeconds(position) }),
  seek: (state, { position }) => merge(state, { position: toSeconds(position) }),
  stop: (state) => merge(state, { playing: false, position: 0 }),
})

export const musicReducer = (state, action) => {
  const handler = HANDLERS[action.type]
  return handler ? handler(state, action) : state
}
