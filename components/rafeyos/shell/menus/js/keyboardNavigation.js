// Arrow-key movement for menus, the Files grid and the desktop icons. Pure: indexes in, index out.

/**
 * Menus wrap around: Down from the last item reaches the first.
 * @returns {number|null} the item to focus, or null when the key isn't a menu key
 */
export const menuStep = (index, key, count) => {
  if (!count) return null
  // Nothing focused yet: Down starts at the top, Up at the bottom
  if (index < 0 && key === 'ArrowDown') return 0
  if (index < 0 && key === 'ArrowUp') return count - 1
  if (key === 'ArrowDown') return (index + 1) % count
  if (key === 'ArrowUp') return (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

const GRID_OFFSETS = Object.freeze({ ArrowRight: 1, ArrowLeft: -1 })

/**
 * Items laid out in rows of `columns` (Files' grid; a list is one column). Stops at the ends.
 * With nothing selected (index -1), any arrow selects the first item.
 * @returns {number|null}
 */
export const gridStep = (index, key, { count, columns }) => {
  if (!count) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const offset = GRID_OFFSETS[key] ?? { ArrowDown: columns, ArrowUp: -columns }[key]
  if (offset === undefined) return null
  if (index < 0) return 0
  const next = index + offset
  return next < 0 || next >= count ? index : next
}

// Unit vectors for each arrow; y grows downwards
const DIRECTIONS = Object.freeze({
  ArrowRight: { x: 1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  ArrowUp: { x: 0, y: -1 },
})

// Distance off the arrow's axis counts double, so Down prefers the icon right below
const OFF_AXIS_WEIGHT = 2

/**
 * Free-form layouts (the desktop's icons): the nearest point in the arrow's direction.
 * @param {{ x: number, y: number }[]} points
 * @returns {number|null} its index; the current index when nothing lies that way; null for other keys
 */
export const nearestInDirection = (points, index, key) => {
  const direction = DIRECTIONS[key]
  if (!direction || !points.length) return null
  if (index < 0) return 0
  const from = points[index]
  let best = index
  let bestScore = Infinity
  points.forEach((point, i) => {
    const dx = point.x - from.x
    const dy = point.y - from.y
    const along = dx * direction.x + dy * direction.y
    if (i === index || along <= 0) return
    const score = along + OFF_AXIS_WEIGHT * Math.abs(dx * direction.y - dy * direction.x)
    if (score < bestScore) {
      best = i
      bestScore = score
    }
  })
  return best
}

/** How many columns a CSS grid shows right now; 1 when it can't tell (a list, or no layout). */
export const gridColumns = (element) => {
  if (!element) return 1
  const tracks = getComputedStyle(element).gridTemplateColumns
  if (!tracks || tracks === 'none' || tracks.includes('repeat')) return 1
  return tracks.trim().split(/\s+/).length
}
