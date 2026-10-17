// Pure geometry for desktop selection: the band between two points and what it touches.

/** The rect spanned by the press point and the current pointer, in either direction. */
export const bandRect = (start, point) => ({
  x: Math.min(start.x, point.x),
  y: Math.min(start.y, point.y),
  w: Math.abs(point.x - start.x),
  h: Math.abs(point.y - start.y),
})

/** Touching counts, as in the mockup: edges that meet overlap. */
export const rectsTouch = (a, b) => !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y)

/**
 * @param {{ x, y, w, h }} band
 * @param {{ path: string, rect: object }[]} icons
 * @returns {string[]} the paths whose icons the band touches
 */
export const pathsInBand = (band, icons) => icons.filter((icon) => rectsTouch(band, icon.rect)).map((icon) => icon.path)

// A press has to travel this far before it counts as a drag (mockup)
export const DRAG_THRESHOLD_PX = 5

export const passedThreshold = (delta) => Math.hypot(delta.x, delta.y) >= DRAG_THRESHOLD_PX

export const sameSelection = (a, b) => a.length === b.length && a.every((path, i) => path === b[i])
