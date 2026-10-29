// @ts-check
// The visitor's files as an external store outside React, persisted to localStorage and kept in step
// across tabs. Every write re-reads the disk first, so a second tab's save is merged rather than clobbered.
// /tmp is the exception: it lives in this store's memory only, laid back over every read, and empties on reload.
import { localStorageOrNull } from '@/lib/browserStorage'
import * as fsState from './fsState'
import { readLegacy } from './legacyDocuments'

/** @import { FsFailure, FsResult, FsState } from './fsState' */
/** @import { FsOpResult } from './fsOps' */

export const FS_KEY = 'rafeyos-fs'
export const LEGACY_KEY = 'rafeyos-documents'

/**
 * @typedef {Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>} FsStorage
 * @typedef {{ addEventListener?: (type: 'storage', listener: (event: Event) => void) => void }} FsWindow
 * @typedef {{ ok: false, reason: 'full' | 'blocked' }} StorageFailure
 * @typedef {{ ok: true, state: FsState, path?: string, name?: string } | { ok: false, reason: FsFailure } | StorageFailure} FsStoreResult
 * @typedef {FsOpResult | StorageFailure} FsCommitResult
 * @typedef {{ state: FsState, readOnly: boolean, hasLegacy: boolean }} Disk
 */

/** @type {{ ok: false, reason: 'blocked' }} */
const BLOCKED = Object.freeze({ ok: false, reason: 'blocked' })
/** @type {{ ok: false, reason: 'full' }} */
const FULL = Object.freeze({ ok: false, reason: 'full' })
// Legacy DOMException codes: 22 in most browsers, 1014 (NS_ERROR_DOM_QUOTA_REACHED) in old Firefox
const QUOTA_CODES = Object.freeze([22, 1014])
const WATCHED_KEYS = Object.freeze([FS_KEY, LEGACY_KEY, null])

/** @param {unknown} error */
const isQuotaError = (error) => {
  if (!error || typeof error !== 'object') return false
  const { name, code } = /** @type {{ name?: unknown, code?: unknown }} */ (error)
  return name === 'QuotaExceededError' || QUOTA_CODES.includes(/** @type {number} */ (code))
}

/**
 * A key's raw text, or null when it is absent or unreadable.
 * @param {FsStorage | null} storage
 * @param {string} key
 * @returns {string | null}
 */
const readRaw = (storage, key) => {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

/**
 * Raw text parsed as JSON, or undefined when it is absent or not JSON.
 * @param {string | null} raw
 * @returns {unknown}
 */
const parseJson = (raw) => {
  try {
    return raw == null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * A value from a build newer than this one: an envelope whose version this code can't read.
 * @param {unknown} raw
 */
const isOtherVersion = (raw) => Boolean(raw) && typeof raw === 'object' && 'v' in /** @type {object} */ (raw)

/**
 * @param {{ storage: FsStorage | null, win?: FsWindow, now: () => number }} deps
 */
export const createFsStore = ({ storage, win, now }) => {
  /** @type {Set<() => void>} */
  const listeners = new Set()

  /**
   * What the disk holds now, falling back to `current` when it holds nothing this build can use; either way with
   * `current`'s /tmp laid over it.
   * @param {FsState} current
   * @returns {Disk}
   */
  const readDisk = (current) => {
    const disk = readStored(current)
    return { ...disk, state: fsState.withTmpFrom(disk.state, current) }
  }

  /**
   * What the disk holds, before /tmp is laid over it.
   * @param {FsState} current
   * @returns {Disk}
   */
  const readStored = (current) => {
    const stored = parseJson(readRaw(storage, FS_KEY))
    const legacyRaw = readRaw(storage, LEGACY_KEY)
    const legacy = parseJson(legacyRaw)
    // Present even when it isn't JSON, so a successful write still clears the junk
    const hasLegacy = legacyRaw != null
    const parsed = fsState.parseState(stored)
    // A tab still on the old bundle may have saved under the old key since the migration
    if (parsed) {
      const merged = legacy === undefined ? parsed : fsState.mergeLegacy(parsed, readLegacy(legacy), now())
      return { state: merged, readOnly: false, hasLegacy }
    }
    if (isOtherVersion(stored)) return { state: current, readOnly: true, hasLegacy }
    if (legacy !== undefined) return { state: fsState.migrateLegacy(readLegacy(legacy), now()), readOnly: false, hasLegacy }
    return { state: current, readOnly: false, hasLegacy }
  }

  // The first load never writes: a migrated or seeded state is persisted by the first successful mutation
  let state = readDisk(fsState.seedState(now())).state

  const notify = () => listeners.forEach((listener) => listener())

  const removeLegacy = () => {
    try {
      storage?.removeItem(LEGACY_KEY)
    } catch {
      // The new key is written and read first; a lingering legacy key is merged again, adding only paths still free
    }
  }

  /**
   * Writes a changed state to storage and makes it current. Storage and state change together or not at all.
   * @template {{ ok: true, state: FsState }} R
   * @param {Disk} disk what the change was made against
   * @param {R} result
   * @returns {R | StorageFailure}
   */
  const persist = (disk, result) => {
    if (!storage || disk.readOnly) return BLOCKED
    try {
      storage.setItem(FS_KEY, fsState.serializeState(result.state))
    } catch (error) {
      return isQuotaError(error) ? FULL : BLOCKED
    }
    state = result.state
    if (disk.hasLegacy) removeLegacy()
    notify()
    return result
  }

  /**
   * The GUI's mutators: re-reads the disk, applies the change and writes it back. A change that only touches /tmp (Save
   * on a file there) stays in memory, as the shell's do. Anything else is refused when storage can't take it, so a
   * blocked store always answers 'blocked'.
   * @param {(state: FsState, now: number) => FsResult} change
   * @returns {FsStoreResult}
   */
  const write = (change) => {
    const disk = readDisk(state)
    const result = change(disk.state, now())
    if (result.ok && fsState.changesOnlyTmp(disk.state, result.state)) {
      state = result.state
      notify()
      return result
    }
    if (!storage || disk.readOnly) return BLOCKED
    return result.ok ? persist(disk, result) : result
  }

  /**
   * The shell's way in: runs `change` (an fsOps call) against the freshly re-read state and keeps what it returns.
   * A change that only touches /tmp stays in memory, so it works however storage is doing.
   * @param {(state: FsState, now: number) => FsOpResult} change
   * @returns {FsCommitResult}
   */
  const commit = (change) => {
    const disk = readDisk(state)
    const result = change(disk.state, now())
    if (!result.ok) return result
    if (!fsState.changesOnlyTmp(disk.state, result.state)) return persist(disk, result)
    state = result.state
    notify()
    return result
  }

  /** @param {Event} event */
  const onStorage = (event) => {
    const { key, storageArea } = /** @type {{ key?: string | null, storageArea?: unknown }} */ (/** @type {unknown} */ (event))
    if (storageArea !== storage || !WATCHED_KEYS.includes(key ?? null)) return
    state = readDisk(state).state
    notify()
  }

  win?.addEventListener?.('storage', onStorage)

  return Object.freeze({
    /** The same object until something changes, as useSyncExternalStore needs. */
    getState: () => state,
    /** @param {() => void} listener */
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** @param {string} folder @param {string} name @param {string} text */
    saveFile: (folder, name, text) => write((current, time) => fsState.saveFile(current, folder, name, text, time)),
    /** @param {string} path the visitor's own text file @param {string} text */
    saveInPlace: (path, text) => write((current, time) => fsState.saveInPlace(current, path, text, time)),
    /** @param {string} path */
    moveToTrash: (path) => write((current, time) => fsState.moveToTrash(current, path, time)),
    /** @param {string} path the file's original path */
    restoreFromTrash: (path) => write((current, time) => fsState.restoreFromTrash(current, path, time)),
    emptyTrash: () => write((current) => fsState.emptyTrash(current)),
    commit,
  })
}

/** @typedef {ReturnType<typeof createFsStore>} FsStore */

/** @type {WeakMap<object, FsStore>} */
const storesByWindow = new WeakMap()

/**
 * One store per window, so every rafeyOS mount (and later `/`) shares it.
 * Without a window (SSR, tests) each call gets its own store with no storage.
 * @param {unknown} win
 * @returns {FsStore}
 */
export const sharedFsStore = (win) => {
  if (!win || typeof win !== 'object') return createFsStore({ storage: null, now: Date.now })
  const existing = storesByWindow.get(win)
  if (existing) return existing
  const browser = /** @type {Window & typeof globalThis} */ (win)
  const store = createFsStore({ storage: localStorageOrNull(browser), win: browser, now: Date.now })
  storesByWindow.set(win, store)
  return store
}
