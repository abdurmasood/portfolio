// @ts-check
import { cascadeRect, clampRect, snapRect, SNAP_MODES } from '@/components/rafeyos/core/geometry'
import { createReducer } from '@/components/rafeyos/state/logic/createReducer'

export const WINDOW_PHASES = Object.freeze({ OPEN: 'open', CLOSING: 'closing' })

export const WINDOW_ACTIONS = Object.freeze({
  OPEN: 'open',
  FOCUS: 'focus',
  MINIMIZE: 'minimize',
  RESTORE: 'restore',
  REQUEST_CLOSE: 'requestClose',
  REMOVE: 'remove',
  SNAP: 'snap',
  UNSNAP: 'unsnap',
  COMMIT_RECT: 'commitRect',
  SET_TITLE: 'setTitle',
  SET_ARG: 'setArg',
  RELAYOUT: 'relayout',
})

/**
 * @import { Rect, SnapMode } from '@/components/rafeyos/core/geometry'
 * @import { AppId, AppInitMap } from '@/components/rafeyos/core/catalog/apps'
 * @import { ActionOf, HandlerMap } from './createReducer'
 */

/**
 * One window. key is app + arg for single-instance apps, so reopening finds it.
 * @typedef {{
 *   id: number,
 *   key: string,
 *   appId: AppId,
 *   arg: string,
 *   init: AppInitMap[AppId] | null,
 *   title: string,
 *   rect: Rect,
 *   prevRect: Rect | null,
 *   mode: SnapMode,
 *   minimized: boolean,
 *   phase: typeof WINDOW_PHASES[keyof typeof WINDOW_PHASES],
 * }} Win
 */

/** @typedef {{ byId: Record<number, Win>, order: number[], focusedId: number | null, nextId: number }} WindowsState */

/**
 * @typedef {{
 *   appId: AppId,
 *   multi: boolean,
 *   arg?: string,
 *   init?: AppInitMap[AppId] | null,
 *   size: readonly number[],
 *   area: Rect,
 *   compact: boolean,
 *   title?: string,
 * }} OpenPayload
 * @typedef {{ id: number }} IdPayload
 */

/**
 * Payload of each window action, by type.
 * @typedef {{
 *   [WINDOW_ACTIONS.OPEN]: OpenPayload,
 *   [WINDOW_ACTIONS.FOCUS]: { id: number | null },
 *   [WINDOW_ACTIONS.MINIMIZE]: IdPayload,
 *   [WINDOW_ACTIONS.RESTORE]: IdPayload,
 *   [WINDOW_ACTIONS.REQUEST_CLOSE]: IdPayload,
 *   [WINDOW_ACTIONS.REMOVE]: IdPayload,
 *   [WINDOW_ACTIONS.SNAP]: { id: number, mode: SnapMode, area: Rect },
 *   [WINDOW_ACTIONS.UNSNAP]: { id: number, rect?: Rect },
 *   [WINDOW_ACTIONS.COMMIT_RECT]: { id: number, rect: Rect },
 *   [WINDOW_ACTIONS.SET_TITLE]: { id: number, title: string },
 *   [WINDOW_ACTIONS.SET_ARG]: { id: number, arg: string | null },
 *   [WINDOW_ACTIONS.RELAYOUT]: { area: Rect, compact: boolean },
 * }} WindowPayloads
 */

/** @typedef {ActionOf<WindowPayloads>} WindowAction */

/**
 * @template {keyof WindowPayloads} T
 * @typedef {(state: WindowsState, action: WindowPayloads[T]) => WindowsState} WindowHandler
 */

/** @type {Readonly<WindowsState>} order is the stacking order, bottom first; the last entry is on top. */
export const initialWindows = Object.freeze({ byId: {}, order: [], focusedId: null, nextId: 1 })

/** @param {Win} win */
const isLive = (win) => win.phase !== WINDOW_PHASES.CLOSING
/** @param {Win} win */
const isShown = (win) => isLive(win) && !win.minimized

/**
 * @param {WindowsState['byId']} byId
 * @param {number[]} order
 * @param {number} excludeId
 * @returns {number | null}
 */
const topShownId = (byId, order, excludeId) => {
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const id = order[i]
    if (id !== excludeId && isShown(byId[id])) return id
  }
  return null
}

/**
 * @param {WindowsState} state
 * @param {number} id
 * @param {Partial<Win>} changes
 * @returns {WindowsState}
 */
const patch = (state, id, changes) => ({ ...state, byId: { ...state.byId, [id]: { ...state.byId[id], ...changes } } })

/**
 * @param {number[]} order
 * @param {number} id
 */
const raise = (order, id) => [...order.filter((other) => other !== id), id]

/** @type {WindowHandler<typeof WINDOW_ACTIONS.FOCUS>} */
const focus = (state, { id }) => {
  if (id === null || id === undefined) return { ...state, focusedId: null }
  if (!state.byId[id]) return state
  return { ...state, order: raise(state.order, id), focusedId: id }
}

/** @type {WindowHandler<typeof WINDOW_ACTIONS.RESTORE>} */
const restore = (state, { id }) => (state.byId[id] ? focus(patch(state, id, { minimized: false }), { id }) : state)

// The window gives up focus; the topmost remaining window takes it
/**
 * @param {WindowsState} state
 * @param {number} id
 */
const yieldFocus = (state, id) =>
  state.focusedId === id ? { ...state, focusedId: topShownId(state.byId, state.order, id) } : state

/** @type {WindowHandler<typeof WINDOW_ACTIONS.MINIMIZE>} */
const minimize = (state, { id }) => {
  const win = state.byId[id]
  if (!win || win.minimized) return state
  return yieldFocus(patch(state, id, { minimized: true }), id)
}

/** @type {WindowHandler<typeof WINDOW_ACTIONS.REQUEST_CLOSE>} */
const requestClose = (state, { id }) =>
  state.byId[id] ? yieldFocus(patch(state, id, { phase: WINDOW_PHASES.CLOSING }), id) : state

/** @type {WindowHandler<typeof WINDOW_ACTIONS.REMOVE>} */
const remove = (state, { id }) => {
  if (!state.byId[id]) return state
  const byId = Object.fromEntries(Object.entries(state.byId).filter(([key]) => Number(key) !== id))
  const order = state.order.filter((other) => other !== id)
  const focusedId = state.focusedId === id ? topShownId(byId, order, id) : state.focusedId
  return { ...state, byId, order, focusedId }
}

/**
 * @param {WindowsState} state
 * @param {string} key
 */
const findLiveByKey = (state, key) => Object.values(state.byId).find((win) => win.key === key && isLive(win))

/**
 * @param {WindowsState} state
 * @param {OpenPayload} action
 * @param {string} key
 * @returns {Win}
 */
const newWindow = (state, action, key) => {
  const { appId, arg = '', size, area, compact, title, init = null } = action
  const shownCount = Object.values(state.byId).filter(isShown).length
  const rect = cascadeRect(area, size, shownCount)
  const snapped = Boolean(compact)
  return {
    id: state.nextId,
    key,
    appId,
    arg,
    // One-off launch options for the app (e.g. Files' initial selection); not part of the key
    init,
    title: title ?? appId,
    rect: snapped ? snapRect(area, SNAP_MODES.MAX) : rect,
    prevRect: snapped ? rect : null,
    mode: snapped ? SNAP_MODES.MAX : SNAP_MODES.NORMAL,
    minimized: false,
    phase: WINDOW_PHASES.OPEN,
  }
}

/**
 * Single-instance apps are keyed by app + arg; reopening restores or focuses the existing window.
 * New launch options replace the old ones, so the app can follow them (Settings opening a page).
 * @type {WindowHandler<typeof WINDOW_ACTIONS.OPEN>}
 */
const open = (state, action) => {
  const key = action.multi ? `${action.appId}#${state.nextId}` : `${action.appId}:${action.arg ?? ''}`
  const existing = action.multi ? null : findLiveByKey(state, key)
  if (existing) {
    const relaunched = action.init ? patch(state, existing.id, { init: { ...action.init } }) : state
    return restore(relaunched, { id: existing.id })
  }
  const win = newWindow(state, action, key)
  return {
    byId: { ...state.byId, [win.id]: win },
    order: [...state.order, win.id],
    focusedId: win.id,
    nextId: state.nextId + 1,
  }
}

/** @type {WindowHandler<typeof WINDOW_ACTIONS.SNAP>} */
const snap = (state, { id, mode, area }) => {
  const win = state.byId[id]
  if (!win) return state
  const prevRect = win.mode === SNAP_MODES.NORMAL ? win.rect : win.prevRect
  return patch(state, id, { rect: snapRect(area, mode), prevRect, mode })
}

/** @type {WindowHandler<typeof WINDOW_ACTIONS.UNSNAP>} rect overrides prevRect, e.g. unsnapForDragRect while dragging a maximized window. */
const unsnap = (state, { id, rect }) => {
  const win = state.byId[id]
  if (!win || win.mode === SNAP_MODES.NORMAL) return state
  const restored = rect ?? win.prevRect
  if (!restored) return state
  return patch(state, id, { rect: { ...restored }, mode: SNAP_MODES.NORMAL })
}

/** @type {WindowHandler<typeof WINDOW_ACTIONS.COMMIT_RECT>} */
const commitRect = (state, { id, rect }) =>
  state.byId[id] ? patch(state, id, { rect: { ...rect }, mode: SNAP_MODES.NORMAL }) : state

/** @type {WindowHandler<typeof WINDOW_ACTIONS.SET_TITLE>} */
const setTitle = (state, { id, title }) => (state.byId[id] ? patch(state, id, { title }) : state)

/** @type {WindowHandler<typeof WINDOW_ACTIONS.SET_ARG>} Points a window at a different file. Refuses when another live window already has it. */
const setArg = (state, { id, arg }) => {
  const win = state.byId[id]
  if (!win) return state
  const key = `${win.appId}:${arg ?? ''}`
  if (win.key === key) return state
  if (findLiveByKey(state, key)) return state
  return patch(state, id, { arg: arg ?? '', key })
}

/**
 * @param {Win} win
 * @param {Rect} area
 * @param {boolean} compact
 * @returns {Win}
 */
const relaidOut = (win, area, compact) => {
  if (win.mode !== SNAP_MODES.NORMAL) return { ...win, rect: snapRect(area, win.mode) }
  const rect = clampRect(win.rect, area)
  if (!compact) return { ...win, rect }
  return { ...win, rect: snapRect(area, SNAP_MODES.MAX), prevRect: rect, mode: SNAP_MODES.MAX }
}

/** @type {WindowHandler<typeof WINDOW_ACTIONS.RELAYOUT>} After a viewport or dock change: snapped windows re-snap, the rest are clamped (or maximized when compact). */
const relayout = (state, { area, compact }) => {
  /** @type {WindowsState['byId']} */
  const byId = {}
  Object.values(state.byId).forEach((win) => {
    byId[win.id] = relaidOut(win, area, compact)
  })
  return { ...state, byId }
}

/** @type {HandlerMap<WindowsState, WindowPayloads>} */
const HANDLERS = Object.freeze({
  [WINDOW_ACTIONS.OPEN]: open,
  [WINDOW_ACTIONS.FOCUS]: focus,
  [WINDOW_ACTIONS.MINIMIZE]: minimize,
  [WINDOW_ACTIONS.RESTORE]: restore,
  [WINDOW_ACTIONS.REQUEST_CLOSE]: requestClose,
  [WINDOW_ACTIONS.REMOVE]: remove,
  [WINDOW_ACTIONS.SNAP]: snap,
  [WINDOW_ACTIONS.UNSNAP]: unsnap,
  [WINDOW_ACTIONS.COMMIT_RECT]: commitRect,
  [WINDOW_ACTIONS.SET_TITLE]: setTitle,
  [WINDOW_ACTIONS.SET_ARG]: setArg,
  [WINDOW_ACTIONS.RELAYOUT]: relayout,
})

export const windowsReducer = createReducer('windows', HANDLERS)
