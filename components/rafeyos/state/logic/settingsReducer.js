import { WALLS } from '@/components/rafeyos/core/theme/walls'

export const STYLES = Object.freeze({ DARK: 'dark', LIGHT: 'light' })
export const DOCK_POSITIONS = Object.freeze(['left', 'bottom', 'right'])
// Where new desktop icons start: top/bottom + left/right
export const ICON_CORNERS = Object.freeze(['tl', 'tr', 'bl', 'br'])
// The Ubuntu Desktop page's dock icon size slider
export const ICON_SIZE_RANGE = Object.freeze({ min: 28, max: 56, step: 4 })
export const VOLUME_RANGE = Object.freeze({ min: 0, max: 100 })

export const DEFAULT_SETTINGS = Object.freeze({
  style: 'dark',
  accent: '#E95420',
  wall: 0,
  dockPos: 'left',
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

const assertKnownKey = (key) => {
  if (!Object.hasOwn(DEFAULT_SETTINGS, key)) throw new Error(`Unknown setting: ${key}`)
}

const CHOICES = Object.freeze({ style: Object.values(STYLES), dockPos: DOCK_POSITIONS, corner: ICON_CORNERS })
const RANGES = Object.freeze({ iconSize: ICON_SIZE_RANGE, volume: VOLUME_RANGE, wall: { min: 0, max: WALLS.length - 1 } })
const HEX_COLOUR = /^#[0-9a-f]{6}$/i

const isValid = (key, value) => {
  if (CHOICES[key]) return CHOICES[key].includes(value)
  if (RANGES[key]) return Number.isInteger(value) && value >= RANGES[key].min && value <= RANGES[key].max
  if (key === 'accent') return HEX_COLOUR.test(value)
  return true
}

const set = (state, { key, value }) => {
  assertKnownKey(key)
  if (typeof value !== typeof DEFAULT_SETTINGS[key]) {
    throw new TypeError(`Setting ${key} expects a ${typeof DEFAULT_SETTINGS[key]}, got ${typeof value}`)
  }
  if (!isValid(key, value)) throw new RangeError(`Invalid value for setting ${key}: ${value}`)
  return state[key] === value ? state : { ...state, [key]: value }
}

/** Booleans flip; style swaps dark and light. */
const toggle = (state, { key }) => {
  assertKnownKey(key)
  if (key === 'style') return { ...state, style: STYLE_TOGGLE[state.style] ?? 'dark' }
  if (typeof DEFAULT_SETTINGS[key] !== 'boolean') throw new TypeError(`Setting ${key} cannot be toggled`)
  return { ...state, [key]: !state[key] }
}

const HANDLERS = Object.freeze({ set, toggle })

export const settingsReducer = (state, action) => {
  const handler = HANDLERS[action.type]
  return handler ? handler(state, action) : state
}
