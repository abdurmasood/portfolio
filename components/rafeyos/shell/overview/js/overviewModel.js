// The Activities overview's window spread, from the windows state. Pure.
import { overviewLayout, overviewRegion } from '../../../wm/geometry'
import { WINDOW_PHASES } from '../../../state/windowsReducer'

export const OVERVIEW_MODES = Object.freeze({ WINDOWS: 'windows', APPS: 'apps' })

/** Windows spread out in windows mode until something is typed; search and the app grid hide them. */
export const spreadsWindows = (overview) => overview?.mode === OVERVIEW_MODES.WINDOWS && !overview.query.trim()

/** Every live window, minimized ones too, bottom of the stack first. */
export const overviewWindows = (windows) =>
  windows.order.map((id) => windows.byId[id]).filter((win) => win.phase !== WINDOW_PHASES.CLOSING)

/** @returns {Map<number, { x: number, y: number, scale: number }>} window id -> target in workspace coordinates */
export const overviewTargets = (windows, area) => {
  const list = overviewWindows(windows)
  const targets = overviewLayout(list.map((win) => win.rect), overviewRegion(area))
  return new Map(list.map((win, i) => [win.id, targets[i]]))
}

/** The CSS transform that moves a window from its rect to its overview target (origin top-left). */
export const windowOverviewTransform = (rect, target) =>
  `translate(${target.x - rect.x}px, ${target.y - rect.y}px) scale(${target.scale})`

export const workspaceTransform = ({ x, y, scale }) => `translate(${x}px, ${y}px) scale(${scale})`
