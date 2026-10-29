// @ts-check
// Every setting rafeyOS has: its default and the values it may take. SAVED_KEYS are the ones kept per visitor.
import { WALLS } from '@/components/rafeyos/core/theme/walls'

export const STYLES = Object.freeze({ DARK: 'dark', LIGHT: 'light' })
export const DOCK_POSITIONS = Object.freeze(['left', 'bottom', 'right'])
// Where new desktop icons start: top/bottom + left/right
export const ICON_CORNERS = Object.freeze(['tl', 'tr', 'bl', 'br'])
// The Ubuntu Desktop page's dock icon size slider
export const ICON_SIZE_RANGE = Object.freeze({ min: 28, max: 56, step: 4 })
export const VOLUME_RANGE = Object.freeze({ min: 0, max: 100 })

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
 * @typedef {'style' | 'accent' | 'wall' | 'dockPos' | 'iconSize' | 'showHome' | 'corner'} SavedKey
 * @typedef {Pick<SettingsState, SavedKey>} SavedSettings
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

// The appearance: saved per visitor. Wi-Fi, Bluetooth, volume, Do Not Disturb and Night Light reset with the page.
/** @type {readonly SavedKey[]} */
export const SAVED_KEYS = Object.freeze(['style', 'accent', 'wall', 'dockPos', 'iconSize', 'showHome', 'corner'])

/** @type {Readonly<Partial<Record<SettingKey, readonly unknown[]>>>} */
const CHOICES = Object.freeze({ style: Object.values(STYLES), dockPos: DOCK_POSITIONS, corner: ICON_CORNERS })
/** @type {Readonly<Partial<Record<SettingKey, { min: number, max: number }>>>} */
const RANGES = Object.freeze({ iconSize: ICON_SIZE_RANGE, volume: VOLUME_RANGE, wall: { min: 0, max: WALLS.length - 1 } })
const HEX_COLOUR = /^#[0-9a-f]{6}$/i

/**
 * @param {SettingKey} key
 * @param {SettingsState[SettingKey]} value - already the key's type (callers check typeof first)
 */
export const isValid = (key, value) => {
  const choices = CHOICES[key]
  if (choices) return choices.includes(value)
  const range = RANGES[key]
  if (range) return typeof value === 'number' && Number.isInteger(value) && value >= range.min && value <= range.max
  if (key === 'accent') return typeof value === 'string' && HEX_COLOUR.test(value)
  return true
}
