// @ts-check
import { createReducer } from '@/components/rafeyos/state/logic/createReducer'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'

export const FILE_VIEWS = Object.freeze({ GRID: 'grid', LIST: 'list' })

export const FILES_ACTIONS = Object.freeze({
  GO: 'go',
  BACK: 'back',
  FORWARD: 'forward',
  SET_VIEW: 'setView',
  SELECT: 'select',
  SET_SEARCH: 'setSearch',
  SELECT_ALL: 'selectAll',
  PRUNE: 'prune',
})

/** @import { ActionOf, HandlerMap } from '@/components/rafeyos/state/logic/createReducer' */

/**
 * search is null when the search bar is closed, a string (possibly empty) while open.
 * @typedef {{
 *   path: string,
 *   back: string[],
 *   fwd: string[],
 *   view: typeof FILE_VIEWS[keyof typeof FILE_VIEWS],
 *   selection: string[],
 *   search: string | null,
 * }} FilesState
 */


/**
 * Payload of each files action, by type.
 * @typedef {{
 *   [FILES_ACTIONS.GO]: { path: string, fromHistory?: boolean },
 *   [FILES_ACTIONS.BACK]: {},
 *   [FILES_ACTIONS.FORWARD]: {},
 *   [FILES_ACTIONS.SET_VIEW]: { view: FilesState['view'] },
 *   [FILES_ACTIONS.SELECT]: { path: string, mode?: 'single' | 'toggle' } | { mode: 'clear' },
 *   [FILES_ACTIONS.SET_SEARCH]: { query: string | null },
 *   [FILES_ACTIONS.SELECT_ALL]: { paths: readonly string[] },
 *   [FILES_ACTIONS.PRUNE]: { exists: (path: string) => boolean, canShow: (path: string) => boolean },
 * }} FilesPayloads
 */

/** @typedef {ActionOf<FilesPayloads>} FilesAction */

/**
 * @template {keyof FilesPayloads} T
 * @typedef {(state: FilesState, action: FilesPayloads[T]) => FilesState} FilesHandler
 */

/**
 * @param {string} [path]
 * @param {readonly string[]} [selection]
 * @returns {Readonly<FilesState>}
 */
export const initialFilesState = (path = HOME, selection = []) =>
  Object.freeze({ path, back: [], fwd: [], view: FILE_VIEWS.GRID, selection: [...selection], search: null })

/** @type {FilesHandler<typeof FILES_ACTIONS.GO>} */
const go = (state, { path, fromHistory = false }) => {
  if (path === state.path && state.search === null) return state
  const history = fromHistory ? {} : { back: [...state.back, state.path], fwd: [] }
  return { ...state, ...history, path, search: null, selection: [] }
}

/** @type {FilesHandler<typeof FILES_ACTIONS.BACK>} */
const back = (state) => {
  if (!state.back.length) return state
  const target = state.back[state.back.length - 1]
  const moved = { ...state, back: state.back.slice(0, -1), fwd: [...state.fwd, state.path] }
  return go(moved, { path: target, fromHistory: true })
}

/** @type {FilesHandler<typeof FILES_ACTIONS.FORWARD>} */
const forward = (state) => {
  if (!state.fwd.length) return state
  const target = state.fwd[state.fwd.length - 1]
  const moved = { ...state, fwd: state.fwd.slice(0, -1), back: [...state.back, state.path] }
  return go(moved, { path: target, fromHistory: true })
}

/** @type {FilesHandler<typeof FILES_ACTIONS.SET_VIEW>} */
const setView = (state, { view }) => {
  if (!Object.values(FILE_VIEWS).includes(view)) throw new Error(`Unknown view: ${view}`)
  return { ...state, view }
}

/** @typedef {(selection: string[], path: string) => string[]} Selector */

const SELECTORS = Object.freeze({
  /** @type {Selector} */
  single: (selection, path) => [path],
  /** @type {Selector} */
  toggle: (selection, path) =>
    selection.includes(path) ? selection.filter((other) => other !== path) : [...selection, path],
  clear: () => [],
})

/** @type {FilesHandler<typeof FILES_ACTIONS.SELECT>} mode: 'single' replaces, 'toggle' adds/removes (Ctrl+click), 'clear' empties. */
const select = (state, action) => {
  if (action.mode === 'clear') return { ...state, selection: SELECTORS.clear() }
  const { path, mode = 'single' } = action
  const pick = SELECTORS[mode]
  if (!pick) throw new Error(`Unknown selection mode: ${mode}`)
  return { ...state, selection: pick(state.selection, path) }
}

/** @type {FilesHandler<typeof FILES_ACTIONS.SET_SEARCH>} */
const setSearch = (state, { query }) => ({ ...state, search: query, selection: [] })

/** @type {FilesHandler<typeof FILES_ACTIONS.SELECT_ALL>} Select All: every item the window currently lists. */
const selectAll = (state, { paths }) => ({ ...state, selection: [...paths] })

/**
 * One history stack with what the window can no longer show taken out. Taking a folder out can leave the same visit
 * twice in a row, or the folder the window now shows on top, where a press of back or forward would change nothing.
 * @param {string[]} entries
 * @param {(path: string) => boolean} canShow
 * @param {string} current
 */
const tidyHistory = (entries, canShow, current) => {
  const kept = entries.filter(canShow).filter((entry, i, shown) => entry !== shown[i - 1])
  return kept[kept.length - 1] === current ? kept.slice(0, -1) : kept
}

/**
 * @type {FilesHandler<typeof FILES_ACTIONS.PRUNE>} Something outside the window (the shell) deleted paths: the selection
 * forgets what is gone and the history forgets what is no longer a folder, so Enter never opens a ghost and back and
 * forward skip what is gone. Nothing gone keeps the same state, so React skips the re-render.
 */
const prune = (state, { exists, canShow }) => {
  const selection = state.selection.filter(exists)
  const back = tidyHistory(state.back, canShow, state.path)
  const fwd = tidyHistory(state.fwd, canShow, state.path)
  const unchanged =
    selection.length === state.selection.length && back.length === state.back.length && fwd.length === state.fwd.length
  return unchanged ? state : { ...state, selection, back, fwd }
}

/** @type {HandlerMap<FilesState, FilesPayloads>} */
const HANDLERS = Object.freeze({
  [FILES_ACTIONS.GO]: go,
  [FILES_ACTIONS.BACK]: back,
  [FILES_ACTIONS.FORWARD]: forward,
  [FILES_ACTIONS.SET_VIEW]: setView,
  [FILES_ACTIONS.SELECT]: select,
  [FILES_ACTIONS.SET_SEARCH]: setSearch,
  [FILES_ACTIONS.SELECT_ALL]: selectAll,
  [FILES_ACTIONS.PRUNE]: prune,
})

export const filesReducer = createReducer('files', HANDLERS)
