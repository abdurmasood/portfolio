// @ts-check
// The visitor's saved appearance as an external store outside React, persisted to localStorage and kept in step
// across tabs. Every write re-reads the disk first, so a second tab's change is kept. Unlike the fs store, a change
// storage refuses still applies for this session: the desktop shows it, and the caller is told it wasn't saved.
import { localStorageOrNull } from '@/lib/browserStorage'
import { ACCENTS } from '@/components/rafeyos/core/theme/accents'
import { DEFAULT_SETTINGS, ICON_SIZE_RANGE, SAVED_KEYS, isValid } from './settingsSchema'

/** @import { SavedKey, SavedSettings } from './settingsSchema' */

export const SETTINGS_KEY = 'rafeyos-settings'
const VERSION = 1

/**
 * @typedef {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} SettingsStorage
 * @typedef {{ addEventListener?: (type: 'storage', listener: (event: Event) => void) => void }} SettingsWindow
 * @typedef {Readonly<Partial<SavedSettings>>} SavedValues
 * @typedef {{ ok: true, state: SavedValues } | { ok: false, reason: 'full' | 'blocked' }} SettingsResult
 * @typedef {{ values: SavedValues, readOnly: boolean }} Disk
 */

/** @type {{ ok: false, reason: 'blocked' }} */
const BLOCKED = Object.freeze({ ok: false, reason: 'blocked' })
/** @type {{ ok: false, reason: 'full' }} */
const FULL = Object.freeze({ ok: false, reason: 'full' })
// Legacy DOMException codes: 22 in most browsers, 1014 (NS_ERROR_DOM_QUOTA_REACHED) in old Firefox
const QUOTA_CODES = Object.freeze([22, 1014])
const WATCHED_KEYS = Object.freeze([SETTINGS_KEY, null])
const ACCENT_HEXES = Object.freeze(ACCENTS.map(({ hex }) => hex))
/** @type {SavedValues} */
const NOTHING_SAVED = Object.freeze({})

/** @param {unknown} error */
const isQuotaError = (error) => {
  if (!error || typeof error !== 'object') return false
  const { name, code } = /** @type {{ name?: unknown, code?: unknown }} */ (error)
  return name === 'QuotaExceededError' || QUOTA_CODES.includes(/** @type {number} */ (code))
}

/**
 * Whether the desktop can show `value` for `key`: the setting's own type and range, one of the listed accents, and
 * an icon size the slider can reach.
 * @param {SavedKey} key
 * @param {unknown} value
 */
const isSavable = (key, value) =>
  typeof value === typeof DEFAULT_SETTINGS[key] &&
  isValid(key, /** @type {SavedSettings[SavedKey]} */ (value)) &&
  (key !== 'accent' || ACCENT_HEXES.includes(/** @type {string} */ (value))) &&
  (key !== 'iconSize' || (/** @type {number} */ (value) - ICON_SIZE_RANGE.min) % ICON_SIZE_RANGE.step === 0)

/**
 * The savable values in `raw`; anything else is dropped, so a hand-edited or stale value can't break the desktop.
 * @param {unknown} raw
 * @returns {SavedValues}
 */
const cleanValues = (raw) => {
  if (!raw || typeof raw !== 'object') return NOTHING_SAVED
  const values = /** @type {Record<string, unknown>} */ (raw)
  return Object.freeze(Object.fromEntries(SAVED_KEYS.filter((key) => isSavable(key, values[key])).map((key) => [key, values[key]])))
}

/**
 * @param {SavedValues} a
 * @param {SavedValues} b
 */
const sameValues = (a, b) => SAVED_KEYS.every((key) => a[key] === b[key])

/**
 * The stored envelope, parsed; undefined when it is absent, unreadable or not JSON.
 * @param {SettingsStorage | null} storage
 * @returns {unknown}
 */
const readEnvelope = (storage) => {
  try {
    const raw = storage?.getItem(SETTINGS_KEY)
    return raw == null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * @param {{ storage: SettingsStorage | null, win?: SettingsWindow }} deps
 */
export const createSettingsStore = ({ storage, win }) => {
  /** @type {Set<() => void>} */
  const listeners = new Set()

  /**
   * What the disk holds now. A newer build's envelope is left alone: this tab keeps `current` and never writes.
   * @param {SavedValues} current
   * @returns {Disk}
   */
  const readDisk = (current) => {
    const envelope = /** @type {{ v?: unknown, values?: unknown } | undefined} */ (readEnvelope(storage))
    if (envelope && typeof envelope === 'object' && 'v' in envelope) {
      return envelope.v === VERSION ? { values: cleanValues(envelope.values), readOnly: false } : { values: current, readOnly: true }
    }
    return { values: NOTHING_SAVED, readOnly: false }
  }

  let state = readDisk(NOTHING_SAVED).values
  // What this session holds that storage refused; it stands in for the disk until a write goes through
  /** @type {SavedValues | null} */
  let unsaved = null

  /** @param {SavedValues} next */
  const adopt = (next) => {
    if (sameValues(state, next)) return
    state = next
    listeners.forEach((listener) => listener())
  }

  /**
   * @param {Disk} disk
   * @param {SavedValues} next
   * @returns {{ ok: true } | { ok: false, reason: 'full' | 'blocked' }}
   */
  const persist = (disk, next) => {
    if (sameValues(disk.values, next)) return { ok: true }
    if (!storage || disk.readOnly) return BLOCKED
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify({ v: VERSION, values: next }))
      return { ok: true }
    } catch (error) {
      return isQuotaError(error) ? FULL : BLOCKED
    }
  }

  /**
   * Re-reads the disk, applies `change` and writes the result back. The session keeps it either way.
   * @param {(values: SavedValues) => SavedValues} change
   * @returns {SettingsResult}
   */
  const write = (change) => {
    const disk = readDisk(state)
    const next = Object.freeze(change(unsaved ?? disk.values))
    const result = persist(disk, next)
    unsaved = result.ok ? null : next
    adopt(next)
    return result.ok ? { ok: true, state } : result
  }

  /** @param {Event} event */
  const onStorage = (event) => {
    const { key, storageArea } = /** @type {{ key?: string | null, storageArea?: unknown }} */ (/** @type {unknown} */ (event))
    if (storageArea !== storage || !WATCHED_KEYS.includes(key ?? null)) return
    adopt(unsaved ?? readDisk(state).values)
  }

  win?.addEventListener?.('storage', onStorage)

  return Object.freeze({
    /** The saved values only (a key is absent until it's set); the same object until something changes. */
    getState: () => state,
    /** @param {() => void} listener */
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /**
     * @param {SavedKey} key
     * @param {unknown} value
     */
    set: (key, value) => {
      if (!SAVED_KEYS.includes(key)) throw new Error(`Not a saved setting: ${key}`)
      if (!isSavable(key, value)) throw new RangeError(`Invalid value for setting ${key}: ${value}`)
      return write((values) => (values[key] === value ? values : { ...values, [key]: value }))
    },
    /** Forgets every saved setting, so each is its default again and the style follows the OS. */
    reset: () => write(() => NOTHING_SAVED),
  })
}

/** @typedef {ReturnType<typeof createSettingsStore>} SettingsStore */

/** @type {WeakMap<object, SettingsStore>} */
const storesByWindow = new WeakMap()

/**
 * One store per window, so every rafeyOS mount (and later `/`) shares it.
 * Without a window (SSR, tests) each call gets its own store with no storage.
 * @param {unknown} win
 * @returns {SettingsStore}
 */
export const sharedSettingsStore = (win) => {
  if (!win || typeof win !== 'object') return createSettingsStore({ storage: null })
  const existing = storesByWindow.get(win)
  if (existing) return existing
  const browser = /** @type {Window & typeof globalThis} */ (win)
  const store = createSettingsStore({ storage: localStorageOrNull(browser), win: browser })
  storesByWindow.set(win, store)
  return store
}
