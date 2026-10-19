import { WINDOW_PHASES } from './windowsReducer'

const BASE_Z_INDEX = 10

const isShown = (win) => win.phase !== WINDOW_PHASES.CLOSING && !win.minimized

/** The highest window that is neither minimized nor closing, or null. */
export const topWindow = (state) => {
  for (let i = state.order.length - 1; i >= 0; i -= 1) {
    const win = state.byId[state.order[i]]
    if (isShown(win)) return win
  }
  return null
}

/**
 * Windows of one app that aren't closing, in stacking order (bottom first).
 * @param {import('./windowsReducer').WindowsState} state
 * @param {string} appId
 * @returns {import('./windowsReducer').Win[]}
 */
export const windowsForApp = (state, appId) =>
  state.order
    .map((id) => state.byId[id])
    .filter((win) => win.appId === appId && win.phase !== WINDOW_PHASES.CLOSING)

/** App ids with at least one live window (minimized counts), in first-opened order. */
export const runningApps = (state) => {
  const ids = Object.keys(state.byId).map(Number).sort((a, b) => a - b)
  const apps = ids.map((id) => state.byId[id]).filter((win) => win.phase !== WINDOW_PHASES.CLOSING)
  return [...new Set(apps.map((win) => win.appId))]
}

export const zIndexOf = (state, id) => {
  const index = state.order.indexOf(id)
  return index < 0 ? null : BASE_Z_INDEX + index
}
