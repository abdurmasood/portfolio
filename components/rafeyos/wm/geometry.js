// Pure window-manager geometry. Rects are { x, y, w, h } in viewport pixels.

export const TOP_BAR_HEIGHT = 28
export const SNAP_MODES = Object.freeze({ NORMAL: 'normal', MAX: 'max', LEFT: 'left', RIGHT: 'right' })
export const DEFAULT_MIN_SIZE = Object.freeze([320, 220])

// Pointer distance from an edge that still counts as "at" it (GNOME's edge tiling)
const TOP_EDGE_TOLERANCE = 2
const SIDE_EDGE_TOLERANCE = 3
const CASCADE_STEPS = 5
const CASCADE_DX = 26
const CASCADE_DY = 22
const OPEN_MARGIN = 24
// A clamped window keeps at least this much of itself on screen
const VISIBLE_W = 120
const VISIBLE_H = 60

/** The area windows may occupy: viewport minus the top bar and the dock. */
export const workArea = ({ viewport, dockPos, dockSize, topBar = TOP_BAR_HEIGHT }) => {
  const h = viewport.h - topBar
  if (dockPos === 'left') return { x: dockSize, y: topBar, w: viewport.w - dockSize, h }
  if (dockPos === 'right') return { x: 0, y: topBar, w: viewport.w - dockSize, h }
  return { x: 0, y: topBar, w: viewport.w, h: h - dockSize }
}

/** Left takes round(w/2), right takes the rest, so the halves always sum to the area. */
export const snapRect = (area, mode) => {
  const half = Math.round(area.w / 2)
  if (mode === SNAP_MODES.LEFT) return { x: area.x, y: area.y, w: half, h: area.h }
  if (mode === SNAP_MODES.RIGHT) return { x: area.x + half, y: area.y, w: area.w - half, h: area.h }
  return { ...area }
}

/** Which snap the pointer asks for while dragging, or null. */
export const snapModeAt = (point, area) => {
  if (point.y <= area.y + TOP_EDGE_TOLERANCE) return SNAP_MODES.MAX
  if (point.x <= area.x + SIDE_EDGE_TOLERANCE) return SNAP_MODES.LEFT
  if (point.x >= area.x + area.w - SIDE_EDGE_TOLERANCE) return SNAP_MODES.RIGHT
  return null
}

/**
 * @param {object} startRect - rect when the gesture began
 * @param {string} edge - n, s, e, w, ne, nw, se or sw
 * @param {{ dx: number, dy: number }} delta - pointer travel since the gesture began
 * @param {{ min?: [number, number], area: object }} limits - the top edge never rises above area.y
 */
export const resizeRect = (startRect, edge, delta, { min = DEFAULT_MIN_SIZE, area }) => {
  const [minW, minH] = min
  const rect = { ...startRect }
  if (edge.includes('e')) rect.w = Math.max(minW, startRect.w + delta.dx)
  if (edge.includes('s')) rect.h = Math.max(minH, startRect.h + delta.dy)
  if (edge.includes('w')) {
    rect.w = Math.max(minW, startRect.w - delta.dx)
    rect.x = startRect.x + startRect.w - rect.w
  }
  if (edge.includes('n')) {
    const top = Math.max(area.y, startRect.y + delta.dy)
    rect.h = Math.max(minH, startRect.h - (top - startRect.y))
    rect.y = startRect.y + startRect.h - rect.h
  }
  return rect
}

/** Where the index-th visible window opens: centred, stepping down-right, cycling every 5. */
export const cascadeRect = (area, [width, height], index) => {
  const w = Math.min(width, area.w - OPEN_MARGIN)
  const h = Math.min(height, area.h - OPEN_MARGIN)
  const step = (index % CASCADE_STEPS) - 1
  const x = Math.round(area.x + (area.w - w) / 2 + step * CASCADE_DX)
  const y = Math.round(area.y + Math.max(10, (area.h - h) / 2 - 16) + step * CASCADE_DY)
  return { x: Math.max(area.x, x), y: Math.max(area.y, y), w, h }
}

/** Shrinks to fit and pulls back on screen after the work area changes. */
export const clampRect = (rect, area) => ({
  w: Math.min(rect.w, area.w),
  h: Math.min(rect.h, area.h),
  x: Math.min(Math.max(area.x, rect.x), area.x + area.w - VISIBLE_W),
  y: Math.min(Math.max(area.y, rect.y), area.y + area.h - VISIBLE_H),
})

/** Dragging a snapped window restores its old size under the pointer, at the same grab ratio. */
export const unsnapForDragRect = (currentRect, prevRect, pointerX, area) => {
  const ratio = (pointerX - currentRect.x) / currentRect.w
  return { x: pointerX - ratio * prevRect.w, y: area.y, w: prevRect.w, h: prevRect.h }
}

/** The region the Activities overview spreads windows across. */
export const overviewRegion = (area) => ({ x: area.x + 50, y: area.y + 40, w: area.w - 100, h: area.h - 90 })

/**
 * Grid layout for the Activities overview.
 * @param {object[]} rects - window rects, bottom of the stack first
 * @param {object} region - see overviewRegion
 * @returns {{ x: number, y: number, scale: number }[]} target top-left and scale per window
 */
export const overviewLayout = (rects, region) => {
  const count = rects.length
  const cols = Math.ceil(Math.sqrt(((count * region.w) / region.h) * 0.7)) || 1
  const rows = Math.ceil(count / cols) || 1
  const cellW = region.w / cols
  const cellH = region.h / rows
  return rects.map((rect, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const scale = Math.min(1, (cellW * 0.86) / rect.w, (cellH * 0.78) / rect.h)
    return {
      x: region.x + col * cellW + (cellW - rect.w * scale) / 2,
      y: region.y + row * cellH + (cellH - rect.h * scale) / 2,
      scale,
    }
  })
}
