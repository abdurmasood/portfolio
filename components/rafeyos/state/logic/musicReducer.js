// @ts-check
// Playback state for the one track. `played` turns on with the first play that actually starts
// (a blocked autoplay doesn't count), and shows the media card. `repeat` loops the track at its end.
import { createReducer } from '@/components/rafeyos/state/logic/createReducer'

export const MUSIC_ACTIONS = Object.freeze({
  REQUEST: 'request',
  STARTED: 'started',
  BLOCKED: 'blocked',
  PAUSE: 'pause',
  TIME: 'time',
  SEEK: 'seek',
  STOP: 'stop',
  TOGGLE_REPEAT: 'toggleRepeat',
})

/** @import { ActionOf, HandlerMap } from './createReducer' */

/** @typedef {{ playing: boolean, position: number, played: boolean, repeat: boolean }} MusicState */

/**
 * Payload of each music action, by type; position is in seconds.
 * @typedef {{
 *   [MUSIC_ACTIONS.REQUEST]: {},
 *   [MUSIC_ACTIONS.STARTED]: {},
 *   [MUSIC_ACTIONS.BLOCKED]: {},
 *   [MUSIC_ACTIONS.PAUSE]: {},
 *   [MUSIC_ACTIONS.TIME]: { position: number },
 *   [MUSIC_ACTIONS.SEEK]: { position: number },
 *   [MUSIC_ACTIONS.STOP]: {},
 *   [MUSIC_ACTIONS.TOGGLE_REPEAT]: {},
 * }} MusicPayloads
 */

/** @typedef {ActionOf<MusicPayloads>} MusicAction */

/** @type {Readonly<MusicState>} */
export const initialMusic = Object.freeze({ playing: false, position: 0, played: false, repeat: false })

/** Whole seconds: the element reports several updates a second, but the UI only shows seconds. */
/** @param {number} seconds */
const toSeconds = (seconds) => (Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0)

/**
 * @param {string} key
 * @returns {key is keyof MusicState}
 */
const isMusicKey = (key) => Object.hasOwn(initialMusic, key)

/**
 * @param {MusicState} state
 * @param {Partial<MusicState>} changes
 * @returns {MusicState}
 */
const merge = (state, changes) =>
  Object.keys(changes).every((key) => isMusicKey(key) && state[key] === changes[key]) ? state : { ...state, ...changes }

/** @type {HandlerMap<MusicState, MusicPayloads>} */
const HANDLERS = Object.freeze({
  // Optimistic, so the button flips at once; `blocked` reverts it if the browser refuses
  [MUSIC_ACTIONS.REQUEST]: (state) => merge(state, { playing: true }),
  [MUSIC_ACTIONS.STARTED]: (state) => merge(state, { playing: true, played: true }),
  [MUSIC_ACTIONS.BLOCKED]: (state) => merge(state, { playing: false }),
  [MUSIC_ACTIONS.PAUSE]: (state) => merge(state, { playing: false }),
  [MUSIC_ACTIONS.TIME]: (state, { position }) => merge(state, { position: toSeconds(position) }),
  [MUSIC_ACTIONS.SEEK]: (state, { position }) => merge(state, { position: toSeconds(position) }),
  [MUSIC_ACTIONS.STOP]: (state) => merge(state, { playing: false, position: 0 }),
  [MUSIC_ACTIONS.TOGGLE_REPEAT]: (state) => merge(state, { repeat: !state.repeat }),
})

export const musicReducer = createReducer('music', HANDLERS)
