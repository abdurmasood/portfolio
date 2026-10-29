// @ts-check
// Window-manager commands on top of windowsReducer. Built once per desktop; it reads the latest
// state and layout through getters, so the object (and every callback on it) stays stable.
import { getApp, handlerFor, isImplemented } from '@/components/rafeyos/core/catalog/apps'
import { SNAP_MODES } from '@/components/rafeyos/core/geometry'
import { windowsForApp } from '@/components/rafeyos/state/logic/selectors'
import { WINDOW_PHASES, WINDOW_ACTIONS } from '@/components/rafeyos/state/logic/windowsReducer'
import { realPath } from '@/components/rafeyos/core/vfs/paths'
import { NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { createSnapPreviewStore } from './snapPreviewStore'

/**
 * @import { Dispatch } from 'react'
 * @import { AppId, OpenApp, OpenAppOptions } from '@/components/rafeyos/core/catalog/apps'
 * @import { Rect, SnapMode } from '@/components/rafeyos/core/geometry'
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { WindowAction, WindowsState } from '@/components/rafeyos/state/logic/windowsReducer'
 * @import { WindowManager } from '@/components/rafeyos/state/logic/contexts'
 */

/** @typedef {NonNullable<Parameters<WindowManager['setCloseGuard']>[1]>} CloseGuard returns false to keep the window open */

/**
 * @typedef {{
 *   dispatch: Dispatch<WindowAction>,
 *   getState: () => WindowsState,
 *   getLayout: () => { area: Rect, compact: boolean },
 *   getVfs: () => Vfs,
 * }} WindowManagerDeps
 */

// File types whose app opens the same window whatever the file
/** @type {ReadonlySet<string>} */
const PATHLESS_TYPES = new Set([NODE_TYPES.MAILTO, NODE_TYPES.AUDIO])

/**
 * @param {WindowsState} state
 * @param {AppId} appId
 * @param {string} arg
 */
const existingWindow = (state, appId, arg) =>
  Object.values(state.byId).find((win) => win.key === `${appId}:${arg}` && win.phase !== WINDOW_PHASES.CLOSING)

/** @param {Dispatch<WindowAction>} dispatch */
const windowCommands = (dispatch) => ({
  /** @param {number | null} id */
  focus: (id) => dispatch({ type: WINDOW_ACTIONS.FOCUS, id }),
  /** @param {number} id */
  minimize: (id) => dispatch({ type: WINDOW_ACTIONS.MINIMIZE, id }),
  /** @param {number} id */
  restore: (id) => dispatch({ type: WINDOW_ACTIONS.RESTORE, id }),
  /** @param {number} id */
  close: (id) => dispatch({ type: WINDOW_ACTIONS.REQUEST_CLOSE, id }),
  /**
   * @param {number} id
   * @param {Rect} [rect]
   */
  unsnap: (id, rect) => dispatch({ type: WINDOW_ACTIONS.UNSNAP, id, rect }),
  /**
   * @param {number} id
   * @param {Rect} rect
   */
  commitRect: (id, rect) => dispatch({ type: WINDOW_ACTIONS.COMMIT_RECT, id, rect }),
})

/**
 * @param {WindowManagerDeps} deps
 * @returns {WindowManager}
 */
export const createWindowManager = ({ dispatch, getState, getLayout, getVfs }) => {
  /** @type {Map<number, Rect>} */
  const openOrigins = new Map()
  /** @type {Map<number, CloseGuard>} */
  const closeGuards = new Map()
  const commands = windowCommands(dispatch)

  /**
   * init: one-off launch options for the app, checked against AppInitMap[appId].
   * @template {AppId} K
   * @param {K} appId
   * @param {OpenAppOptions<K>} [options]
   * @returns {boolean} false when the app has no UI yet
   */
  const openApp = (appId, { path = '', from = null, init = null } = {}) => {
    if (!isImplemented(appId)) return false
    const app = getApp(appId)
    const arg = path || app.defaultPath
    const state = getState()
    if (from && (app.multi || !existingWindow(state, appId, arg))) openOrigins.set(state.nextId, from)
    const { area, compact } = getLayout()
    dispatch({ type: WINDOW_ACTIONS.OPEN, appId, multi: app.multi, arg, init, size: app.size, area, compact, title: app.name })
    return true
  }

  /**
   * Opens a file in its default app; false for web links and apps that aren't built yet.
   * `vfs` is the tree to read when the caller has a newer one than the last render (the terminal, just after a write).
   * @param {string} path
   * @param {{ from?: Rect | null, vfs?: Vfs }} [options]
   */
  const openPath = (path, { from = null, vfs = getVfs() } = {}) => {
    const target = realPath(vfs, path)
    const node = vfs[target]
    const appId = node ? handlerFor(node) : null
    if (!appId) return false
    // Mail composes a fresh message rather than opening the .desktop file; Music is one library window
    return openApp(appId, { path: PATHLESS_TYPES.has(node.type) ? '' : target, from })
  }

  /**
   * @param {number} id
   * @param {SnapMode} mode
   */
  const snap = (id, mode) => dispatch({ type: WINDOW_ACTIONS.SNAP, id, mode, area: getLayout().area })

  /** @param {number} id */
  const toggleMax = (id) => {
    const win = getState().byId[id]
    if (!win) return
    if (win.mode === SNAP_MODES.NORMAL) snap(id, SNAP_MODES.MAX)
    else commands.unsnap(id)
  }

  /**
   * @param {number} id
   * @param {() => void} [next]
   */
  const close = (id, next) => {
    const guard = closeGuards.get(id)
    if (guard && guard(next) === false) return
    commands.close(id)
    next?.()
  }

  /**
   * @param {number} id
   * @param {CloseGuard | null} guard
   */
  const setCloseGuard = (id, guard) => {
    if (guard) closeGuards.set(id, guard)
    else closeGuards.delete(id)
  }

  /** @param {number} id */
  const remove = (id) => {
    openOrigins.delete(id)
    closeGuards.delete(id)
    dispatch({ type: WINDOW_ACTIONS.REMOVE, id })
  }

  /**
   * @param {number} id
   * @param {string | null} arg
   */
  const setArg = (id, arg) => dispatch({ type: WINDOW_ACTIONS.SET_ARG, id, arg })

  /**
   * @param {number} id
   * @param {string} title
   */
  const setTitle = (id, title) => {
    if (getState().byId[id]?.title !== title) dispatch({ type: WINDOW_ACTIONS.SET_TITLE, id, title })
  }

  return Object.freeze({
    ...commands,
    close,
    openApp,
    openPath,
    snap,
    toggleMax,
    remove,
    setTitle,
    setArg,
    setCloseGuard,
    /**
     * @param {AppId} appId
     * @param {Rect | null} [from]
     */
    activateApp: (appId, from) => activateApp({ appId, from, getState, openApp, commands }),
    /** @param {number} id */
    openOrigin: (id) => openOrigins.get(id) ?? null,
    snapPreview: createSnapPreviewStore(),
  })
}

/**
 * Dock click: launch, or minimize the app if it has focus, or bring all its windows up.
 * @param {{
 *   appId: AppId,
 *   from?: Rect | null,
 *   getState: () => WindowsState,
 *   openApp: OpenApp,
 *   commands: ReturnType<typeof windowCommands>,
 * }} deps
 */
const activateApp = ({ appId, from, getState, openApp, commands }) => {
  const state = getState()
  const windows = windowsForApp(state, appId)
  if (!windows.length) return openApp(appId, { from })
  if (state.focusedId !== null && state.byId[state.focusedId]?.appId === appId) {
    windows.forEach((win) => commands.minimize(win.id))
    return true
  }
  // Bottom first, so the app's top window ends up focused
  windows.forEach((win) => (win.minimized ? commands.restore(win.id) : commands.focus(win.id)))
  return true
}
