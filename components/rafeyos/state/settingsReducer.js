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

const set = (state, { key, value }) => {
  assertKnownKey(key)
  if (typeof value !== typeof DEFAULT_SETTINGS[key]) {
    throw new TypeError(`Setting ${key} expects a ${typeof DEFAULT_SETTINGS[key]}, got ${typeof value}`)
  }
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
