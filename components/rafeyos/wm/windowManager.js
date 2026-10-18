// Window-manager commands on top of windowsReducer. Built once per desktop; it reads the latest
// state and layout through getters, so the object (and every callback on it) stays stable.
import { getApp, handlerFor, isImplemented } from '../apps/registry'
import { SNAP_MODES } from './geometry'
import { windowsForApp } from '../state/selectors'
import { WINDOW_PHASES } from '../state/windowsReducer'
import { realPath } from '../vfs/paths'
import { NODE_TYPES } from '../vfs/buildVfs'
import { createSnapPreviewStore } from './snapPreviewStore'

// File types whose app opens the same window whatever the file
const PATHLESS_TYPES = new Set([NODE_TYPES.MAILTO, NODE_TYPES.AUDIO])

const existingWindow = (state, appId, arg) =>
  Object.values(state.byId).find((win) => win.key === `${appId}:${arg}` && win.phase !== WINDOW_PHASES.CLOSING)

const windowCommands = (dispatch) => ({
  focus: (id) => dispatch({ type: 'focus', id }),
  minimize: (id) => dispatch({ type: 'minimize', id }),
  restore: (id) => dispatch({ type: 'restore', id }),
  close: (id) => dispatch({ type: 'requestClose', id }),
  unsnap: (id, rect) => dispatch({ type: 'unsnap', id, rect }),
  commitRect: (id, rect) => dispatch({ type: 'commitRect', id, rect }),
})

/**
 * @param {{ dispatch: Function, getState: () => object, getLayout: () => object, getVfs: () => object }} deps
 */
export const createWindowManager = ({ dispatch, getState, getLayout, getVfs }) => {
  const openOrigins = new Map()
  const closeGuards = new Map()
  const commands = windowCommands(dispatch)

  /**
   * @param {{ path?: string, from?: object, init?: object }} options - init: one-off launch options for the app
   * @returns {boolean} false when the app has no UI yet
   */
  const openApp = (appId, { path = '', from = null, init = null } = {}) => {
    if (!isImplemented(appId)) return false
    const app = getApp(appId)
    const arg = path || app.defaultPath
    const state = getState()
    if (from && (app.multi || !existingWindow(state, appId, arg))) openOrigins.set(state.nextId, from)
    const { area, compact } = getLayout()
    dispatch({ type: 'open', appId, multi: app.multi, arg, init, size: app.size, area, compact, title: app.name })
    return true
  }

  /** Opens a file in its default app; false for web links and apps that aren't built yet. */
  const openPath = (path, { from = null } = {}) => {
    const vfs = getVfs()
    const target = realPath(vfs, path)
    const node = vfs[target]
    const appId = node ? handlerFor(node) : null
    if (!appId) return false
    // Mail composes a fresh message rather than opening the .desktop file; Music is one library window
    return openApp(appId, { path: PATHLESS_TYPES.has(node.type) ? '' : target, from })
  }

  const snap = (id, mode) => dispatch({ type: 'snap', id, mode, area: getLayout().area })

  const toggleMax = (id) => {
    const win = getState().byId[id]
    if (!win) return
    if (win.mode === SNAP_MODES.NORMAL) snap(id, SNAP_MODES.MAX)
    else commands.unsnap(id)
  }

  const close = (id, next) => {
    const guard = closeGuards.get(id)
    if (guard && guard(next) === false) return
    commands.close(id)
    next?.()
  }

  const setCloseGuard = (id, guard) => {
    if (guard) closeGuards.set(id, guard)
    else closeGuards.delete(id)
  }

  const remove = (id) => {
    openOrigins.delete(id)
    closeGuards.delete(id)
    dispatch({ type: 'remove', id })
  }

  const setArg = (id, arg) => dispatch({ type: 'setArg', id, arg })

  const setTitle = (id, title) => {
    if (getState().byId[id]?.title !== title) dispatch({ type: 'setTitle', id, title })
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
    activateApp: (appId, from) => activateApp({ appId, from, getState, openApp, commands }),
    openOrigin: (id) => openOrigins.get(id) ?? null,
    snapPreview: createSnapPreviewStore(),
  })
}

/** Dock click: launch, or minimize the app if it has focus, or bring all its windows up. */
const activateApp = ({ appId, from, getState, openApp, commands }) => {
  const state = getState()
  const windows = windowsForApp(state, appId)
  if (!windows.length) return openApp(appId, { from })
  if (state.byId[state.focusedId]?.appId === appId) {
    windows.forEach((win) => commands.minimize(win.id))
    return true
  }
  // Bottom first, so the app's top window ends up focused
  windows.forEach((win) => (win.minimized ? commands.restore(win.id) : commands.focus(win.id)))
  return true
}
