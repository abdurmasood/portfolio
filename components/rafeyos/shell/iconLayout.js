export const DEFAULT_ICON_CELL = Object.freeze({ w: 90, h: 88 })
const MARGIN = 8
const EDGE_PADDING = 16

/**
 * Desktop icon positions: fills columns top-to-bottom, starting from the chosen corner.
 * @param {string[]} paths
 * @param {object} area - work area rect
 * @param {'tl'|'tr'|'bl'|'br'} corner
 * @returns {{ path: string, x: number, y: number }[]}
 */
export const iconLayout = (paths, area, corner, cell = DEFAULT_ICON_CELL) => {
  const rows = Math.max(1, Math.floor((area.h - EDGE_PADDING) / cell.h))
  const cols = Math.max(1, Math.floor((area.w - EDGE_PADDING) / cell.w))
  const fromLeft = corner.includes('l')
  const fromTop = corner.includes('t')
  return paths.map((path, i) => {
    const col = Math.floor(i / rows)
    const row = i % rows
    // Overflowing columns wrap back to the first column rather than leaving the screen
    const shownCol = col >= cols ? 0 : col
    const x = fromLeft ? area.x + MARGIN + shownCol * cell.w : area.x + area.w - MARGIN - cell.w - shownCol * cell.w
    const y = fromTop ? area.y + MARGIN + row * cell.h : area.y + area.h - MARGIN - cell.h - row * cell.h
    return { path, x, y }
  })
}
