// @ts-check
import { DEFAULT_SETTINGS, isValid } from '@/components/rafeyos/core/settings/settingsSchema'
import { createReducer } from '@/components/rafeyos/state/logic/createReducer'

export const SETTINGS_ACTIONS = Object.freeze({ SET: 'set', TOGGLE: 'toggle' })

// Defaults and validation live in core, where the saved-settings store needs them too
export {
  DEFAULT_SETTINGS,
  DOCK_POSITIONS,
  ICON_CORNERS,
  ICON_SIZE_RANGE,
  STYLES,
  VOLUME_RANGE,
} from '@/components/rafeyos/core/settings/settingsSchema'

/** @import { ActionOf, HandlerMap } from './createReducer' */

/**
 * @typedef {import('@/components/rafeyos/core/settings/settingsSchema').SettingsState} SettingsState
 * @typedef {import('@/components/rafeyos/core/settings/settingsSchema').SettingKey} SettingKey
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

export const initialSettings = DEFAULT_SETTINGS

const STYLE_TOGGLE = Object.freeze({ dark: 'light', light: 'dark' })

/** @param {string} key */
const assertKnownKey = (key) => {
  if (!Object.hasOwn(DEFAULT_SETTINGS, key)) throw new Error(`Unknown setting: ${key}`)
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
