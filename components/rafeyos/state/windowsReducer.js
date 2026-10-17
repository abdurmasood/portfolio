import { cascadeRect, clampRect, snapRect, SNAP_MODES } from '../wm/geometry'

export const WINDOW_PHASES = Object.freeze({ OPEN: 'open', CLOSING: 'closing' })

/** order is the stacking order, bottom first; the last entry is on top. */
export const initialWindows = Object.freeze({ byId: {}, order: [], focusedId: null, nextId: 1 })

const isLive = (win) => win.phase !== WINDOW_PHASES.CLOSING
const isShown = (win) => isLive(win) && !win.minimized

const topShownId = (byId, order, excludeId) => {
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const id = order[i]
    if (id !== excludeId && isShown(byId[id])) return id
  }
  return null
}

const patch = (state, id, changes) => ({ ...state, byId: { ...state.byId, [id]: { ...state.byId[id], ...changes } } })

const raise = (order, id) => [...order.filter((other) => other !== id), id]

const focus = (state, { id }) => {
  if (id === null || id === undefined) return { ...state, focusedId: null }
  if (!state.byId[id]) return state
  return { ...state, order: raise(state.order, id), focusedId: id }
}

const restore = (state, { id }) => (state.byId[id] ? focus(patch(state, id, { minimized: false }), { id }) : state)

// The window gives up focus; the topmost remaining window takes it
const yieldFocus = (state, id) =>
  state.focusedId === id ? { ...state, focusedId: topShownId(state.byId, state.order, id) } : state

const minimize = (state, { id }) => {
  const win = state.byId[id]
  if (!win || win.minimized) return state
  return yieldFocus(patch(state, id, { minimized: true }), id)
}

const requestClose = (state, { id }) =>
  state.byId[id] ? yieldFocus(patch(state, id, { phase: WINDOW_PHASES.CLOSING }), id) : state

const remove = (state, { id }) => {
  if (!state.byId[id]) return state
  const byId = Object.fromEntries(Object.entries(state.byId).filter(([key]) => Number(key) !== id))
  const order = state.order.filter((other) => other !== id)
  const focusedId = state.focusedId === id ? topShownId(byId, order, id) : state.focusedId
  return { ...state, byId, order, focusedId }
}

const findLiveByKey = (state, key) => Object.values(state.byId).find((win) => win.key === key && isLive(win))

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

const snap = (state, { id, mode, area }) => {
  const win = state.byId[id]
  if (!win) return state
  const prevRect = win.mode === SNAP_MODES.NORMAL ? win.rect : win.prevRect
  return patch(state, id, { rect: snapRect(area, mode), prevRect, mode })
}

/** rect overrides prevRect, e.g. unsnapForDragRect while dragging a maximized window. */
const unsnap = (state, { id, rect }) => {
  const win = state.byId[id]
  if (!win || win.mode === SNAP_MODES.NORMAL || !(rect || win.prevRect)) return state
  return patch(state, id, { rect: { ...(rect ?? win.prevRect) }, mode: SNAP_MODES.NORMAL })
}

const commitRect = (state, { id, rect }) =>
  state.byId[id] ? patch(state, id, { rect: { ...rect }, mode: SNAP_MODES.NORMAL }) : state

const setTitle = (state, { id, title }) => (state.byId[id] ? patch(state, id, { title }) : state)

const relaidOut = (win, area, compact) => {
  if (win.mode !== SNAP_MODES.NORMAL) return { ...win, rect: snapRect(area, win.mode) }
  const rect = clampRect(win.rect, area)
  if (!compact) return { ...win, rect }
  return { ...win, rect: snapRect(area, SNAP_MODES.MAX), prevRect: rect, mode: SNAP_MODES.MAX }
}

/** After a viewport or dock change: snapped windows re-snap, the rest are clamped (or maximized when compact). */
const relayout = (state, { area, compact }) => {
  const byId = {}
  Object.values(state.byId).forEach((win) => {
    byId[win.id] = relaidOut(win, area, compact)
  })
  return { ...state, byId }
}

const HANDLERS = Object.freeze({
  open,
  focus,
  minimize,
  restore,
  requestClose,
  remove,
  snap,
  unsnap,
  commitRect,
  setTitle,
  relayout,
})

export const windowsReducer = (state, action) => {
  const handler = HANDLERS[action.type]
  return handler ? handler(state, action) : state
}
