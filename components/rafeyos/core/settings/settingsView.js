// @ts-check
// The appearance as commands see it: read straight from the store, so a value set earlier on the same line is
// already there, with the OS's style standing in until one is saved.
import { DEFAULT_SETTINGS, SAVED_KEYS, STYLES } from './settingsSchema'

/** @import { SavedKey, SavedSettings } from './settingsSchema' */
/** @import { SavedValues, SettingsStore } from './settingsStore' */

/** @type {Readonly<SavedSettings>} */
const SAVED_DEFAULTS = Object.freeze(
  /** @type {SavedSettings} */ (Object.fromEntries(SAVED_KEYS.map((key) => [key, DEFAULT_SETTINGS[key]]))),
)

/**
 * The appearance in effect: what's saved, each default otherwise, and the style the OS prefers until one is picked.
 * @param {SavedValues} saved
 * @param {boolean} prefersDark
 * @returns {SavedSettings}
 */
export const effectiveSettings = (saved, prefersDark) => ({
  ...SAVED_DEFAULTS,
  ...saved,
  style: saved.style ?? (prefersDark ? STYLES.DARK : STYLES.LIGHT),
})

/**
 * @param {{ store: SettingsStore, prefersDark: () => boolean }} deps
 */
export const settingsView = ({ store, prefersDark }) => {
  const effective = () => effectiveSettings(store.getState(), prefersDark())
  return Object.freeze({
    /** @param {SavedKey} key */
    get: (key) => effective()[key],
    /** @param {SavedKey} key @param {unknown} value */
    set: (key, value) => store.set(key, value),
    /** @param {SavedKey} [key] */
    reset: (key) => store.reset(key),
    /** What is saved, as the store holds it: a key is absent while it follows its default. */
    getState: () => store.getState(),
    effective,
  })
}

/** @typedef {ReturnType<typeof settingsView>} SettingsView */
