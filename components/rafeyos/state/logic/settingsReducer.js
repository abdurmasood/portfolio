// @ts-check
import { WALLS } from '@/components/rafeyos/core/theme/walls'
import { createReducer } from '@/components/rafeyos/state/logic/createReducer'

export const SETTINGS_ACTIONS = Object.freeze({ SET: 'set', TOGGLE: 'toggle' })

export const STYLES = Object.freeze({ DARK: 'dark', LIGHT: 'light' })
export const DOCK_POSITIONS = Object.freeze(['left', 'bottom', 'right'])
// Where new desktop icons start: top/bottom + left/right
export const ICON_CORNERS = Object.freeze(['tl', 'tr', 'bl', 'br'])
// The Ubuntu Desktop page's dock icon size slider
export const ICON_SIZE_RANGE = Object.freeze({ min: 28, max: 56, step: 4 })
export const VOLUME_RANGE = Object.freeze({ min: 0, max: 100 })

/** @import { ActionOf, HandlerMap } from './createReducer' */

/**
 * @typedef {{
 *   style: typeof STYLES[keyof typeof STYLES],
 *   accent: string,
 *   wall: number,
 *   dockPos: string,
 *   iconSize: number,
 *   showHome: boolean,
 *   corner: string,
 *   dnd: boolean,
 *   night: boolean,
 *   wifi: boolean,
 *   bt: boolean,
 *   volume: number,
 * }} SettingsState
 * @typedef {keyof SettingsState} SettingKey
 */

/**
 * Payload of each settings action, by type. `set` pairs each key with its own value type.
 * @typedef {{
 *   [SETTINGS_ACTIONS.SET]: { [K in SettingKey]: { key: K, value: SettingsState[K] } }[SettingKey],
 *   [SETTINGS_ACTIONS.TOGGLE]: { key: SettingKey },
 * }} SettingsPayloads
 */

/** @typedef {ActionOf<SettingsPayloads>} SettingsAction */

/**
 * @template {keyof SettingsPayloads} T
 * @typedef {(state: SettingsState, action: SettingsPayloads[T]) => SettingsState} SettingsHandler
 */

/** @type {Readonly<SettingsState>} */
export const DEFAULT_SETTINGS = Object.freeze({
  style: 'dark',
  accent: '#E95420',
  wall: 0,
  dockPos: 'bottom',
  iconSize: 40,
  showHome: true,
  corner: 'tl',
  dnd: false,
  night: false,
  wifi: true,
  bt: false,
  volume: 70,
})

export const initialSettings = DEFAULT_SETTINGS

const STYLE_TOGGLE = Object.freeze({ dark: 'light', light: 'dark' })

/** @param {string} key */
const assertKnownKey = (key) => {
  if (!Object.hasOwn(DEFAULT_SETTINGS, key)) throw new Error(`Unknown setting: ${key}`)
}

/** @type {Readonly<Partial<Record<SettingKey, readonly unknown[]>>>} */
const CHOICES = Object.freeze({ style: Object.values(STYLES), dockPos: DOCK_POSITIONS, corner: ICON_CORNERS })
/** @type {Readonly<Partial<Record<SettingKey, { min: number, max: number }>>>} */
const RANGES = Object.freeze({ iconSize: ICON_SIZE_RANGE, volume: VOLUME_RANGE, wall: { min: 0, max: WALLS.length - 1 } })
const HEX_COLOUR = /^#[0-9a-f]{6}$/i

/**
 * @param {SettingKey} key
 * @param {SettingsState[SettingKey]} value - already the key's type (set checks typeof first)
 */
const isValid = (key, value) => {
  const choices = CHOICES[key]
  if (choices) return choices.includes(value)
  const range = RANGES[key]
  if (range) return typeof value === 'number' && Number.isInteger(value) && value >= range.min && value <= range.max
  if (key === 'accent') return typeof value === 'string' && HEX_COLOUR.test(value)
  return true
}

/** @type {SettingsHandler<typeof SETTINGS_ACTIONS.SET>} */
const set = (state, { key, value }) => {
  assertKnownKey(key)
  if (typeof value !== typeof DEFAULT_SETTINGS[key]) {
    throw new TypeError(`Setting ${key} expects a ${typeof DEFAULT_SETTINGS[key]}, got ${typeof value}`)
  }
  if (!isValid(key, value)) throw new RangeError(`Invalid value for setting ${key}: ${value}`)
  return state[key] === value ? state : { ...state, [key]: value }
}

/** @type {SettingsHandler<typeof SETTINGS_ACTIONS.TOGGLE>} Booleans flip; style swaps dark and light. */
const toggle = (state, { key }) => {
  assertKnownKey(key)
  if (key === 'style') return { ...state, style: STYLE_TOGGLE[state.style] ?? 'dark' }
  if (typeof DEFAULT_SETTINGS[key] !== 'boolean') throw new TypeError(`Setting ${key} cannot be toggled`)
  return { ...state, [key]: !state[key] }
}

/** @type {HandlerMap<SettingsState, SettingsPayloads>} */
const HANDLERS = Object.freeze({ [SETTINGS_ACTIONS.SET]: set, [SETTINGS_ACTIONS.TOGGLE]: toggle })

export const settingsReducer = createReducer('settings', HANDLERS)
