// Pure drag and resize gesture state. The hooks feed pointer points in and write rects out.
import { SNAP_MODES, resizeRect, snapModeAt, unsnapForDragRect } from './geometry'

// Pointer travel before a press on the header becomes a drag (lets double-click through)
export const DRAG_THRESHOLD = 5

/** @param {object} win - the window as the reducer holds it */
export const startDrag = (win, start, area) =>
  Object.freeze({ win, start, area, origin: win.rect, rect: win.rect, moved: false, mode: null, unsnapped: null })

const isSnapped = (win) => win.mode !== SNAP_MODES.NORMAL && Boolean(win.prevRect)

/**
 * One pointer step. `unsnapped` is set only on the step that pulls a snapped window
 * free; the caller commits it once so the window takes its old size under the pointer.
 */
export const stepDrag = (drag, point) => {
  const dx = point.x - drag.start.x
  const dy = point.y - drag.start.y
  if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return drag
  const unsnapped =
    !drag.moved && isSnapped(drag.win) ? unsnapForDragRect(drag.win.rect, drag.win.prevRect, drag.start.x, drag.area) : null
  const origin = unsnapped ?? drag.origin
  const rect = { ...origin, x: origin.x + dx, y: Math.max(drag.area.y, origin.y + dy) }
  return { ...drag, origin, rect, moved: true, mode: snapModeAt(point, drag.area), unsnapped }
}

export const startResize = (win, start, { edge, min, area }) =>
  Object.freeze({ start, edge, min, area, origin: win.rect, rect: win.rect, moved: false })

export const stepResize = (resize, point) => {
  const delta = { dx: point.x - resize.start.x, dy: point.y - resize.start.y }
  const rect = resizeRect(resize.origin, resize.edge, delta, { min: resize.min, area: resize.area })
  return { ...resize, rect, moved: true }
}
