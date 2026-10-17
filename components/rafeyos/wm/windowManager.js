// Window-manager commands on top of windowsReducer. Built once per desktop; it reads the latest
// state and layout through getters, so the object (and every callback on it) stays stable.
import { getApp } from '../apps/registry'
import { isImplemented } from '../apps/availability'
import { SNAP_MODES } from './geometry'
import { windowsForApp } from '../state/selectors'
import { WINDOW_PHASES } from '../state/windowsReducer'
import { realPath } from '../vfs/paths'
import { NODE_TYPES } from '../vfs/buildVfs'
import { createSnapPreviewStore } from './snapPreviewStore'

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
 * @param {{ dispatch: Function, getState: () => object, getLayout: () => object, vfs: object }} deps
 */
export const createWindowManager = ({ dispatch, getState, getLayout, vfs }) => {
  const openOrigins = new Map()
  const commands = windowCommands(dispatch)

  /** @returns {boolean} false when the app has no UI yet */
  const openApp = (appId, { path = '', from = null } = {}) => {
    if (!isImplemented(appId)) return false
    const app = getApp(appId)
    const state = getState()
    if (from && (app.multi || !existingWindow(state, appId, path))) openOrigins.set(state.nextId, from)
    const { area, compact } = getLayout()
    dispatch({ type: 'open', appId, multi: app.multi, arg: path, size: app.size, area, compact, title: app.name })
    return true
  }

  /** Folders open in Files; other files need apps that aren't built yet, so this returns false. */
  const openPath = (path, { from = null } = {}) => {
    const target = realPath(vfs, path)
    if (vfs[target]?.type !== NODE_TYPES.DIR) return false
    return openApp('files', { path: target, from })
  }

  const snap = (id, mode) => dispatch({ type: 'snap', id, mode, area: getLayout().area })

  const toggleMax = (id) => {
    const win = getState().byId[id]
    if (!win) return
    if (win.mode === SNAP_MODES.NORMAL) snap(id, SNAP_MODES.MAX)
    else commands.unsnap(id)
  }

  const remove = (id) => {
    openOrigins.delete(id)
    dispatch({ type: 'remove', id })
  }

  const setTitle = (id, title) => {
    if (getState().byId[id]?.title !== title) dispatch({ type: 'setTitle', id, title })
  }

  return Object.freeze({
    ...commands,
    openApp,
    openPath,
    snap,
    toggleMax,
    remove,
    setTitle,
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
