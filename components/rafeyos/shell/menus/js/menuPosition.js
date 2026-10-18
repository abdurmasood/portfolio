const EDGE_GAP = 6
const DEFAULT_MIN_TOP = 34

/**
 * Keeps a menu inside the viewport and below the top bar.
 * @param {{ x: number, y: number }} point - requested top-left (or bottom-left with anchorBottom)
 * @param {{ w: number, h: number }} size - the menu's measured size
 * @param {{ w: number, h: number }} viewport
 * @returns {{ left: number, top: number }}
 */
export const menuPosition = ({ x, y }, size, viewport, { anchorBottom = false, minTop = DEFAULT_MIN_TOP } = {}) => {
  const left = Math.min(x, viewport.w - size.w - EDGE_GAP)
  const top = anchorBottom ? y - size.h : Math.min(y, viewport.h - size.h - EDGE_GAP)
  return { left: Math.max(EDGE_GAP, left), top: Math.max(minTop, top) }
}
