// macOS dock magnification: discrete hover tiers, sprung with a fixed-step integrator

/** Size multiples for the hovered icon, its neighbours and the next ones out; the rest stay at 1. */
export const MAGNIFY_TIERS = Object.freeze([1.72, 1.46, 1.22])
// Framer's spring with bounce .2 over .4 s
export const SPRING = Object.freeze({ stiffness: 246, damping: 25 })
// Fixed 1/240 s steps keep the spring identical at any frame rate
export const STEP = 1 / 240
// The longest gap integrated in one frame, so a backgrounded tab doesn't lurch on return
export const MAX_FRAME = 0.05
const SETTLE_DISTANCE = 0.05
const SETTLE_SPEED = 0.5

/**
 * @param {number} index - the icon's position in its group
 * @param {number} hotIndex - the hovered icon's position, or -1 when nothing in the group is hovered
 * @param {number} rest - the resting size in px
 */
export const targetSize = (index, hotIndex, rest) => {
  if (hotIndex < 0) return rest
  const tier = MAGNIFY_TIERS[Math.abs(index - hotIndex)]
  return tier ? rest * tier : rest
}

/**
 * Every key's target size. Only the hovered key's group swells, so Trash never grows for Settings.
 * @param {string[][]} groups
 * @param {string | null} hot
 * @param {number} rest
 * @returns {Map<string, number>}
 */
export const targetSizes = (groups, hot, rest) => {
  const sizes = new Map()
  groups.forEach((group) => {
    const hotIndex = group.indexOf(hot)
    group.forEach((key, index) => sizes.set(key, targetSize(index, hotIndex, rest)))
  })
  return sizes
}

/**
 * Advances one icon's spring by `seconds`.
 * @param {{ size: number, velocity: number }} spring
 * @param {number} target
 * @param {number} seconds
 */
export const stepSpring = ({ size, velocity }, target, seconds) => {
  let nextSize = size
  let nextVelocity = velocity
  for (let remaining = Math.min(seconds, MAX_FRAME); remaining > 0; remaining -= STEP) {
    const step = Math.min(remaining, STEP)
    nextVelocity += (SPRING.stiffness * (target - nextSize) - SPRING.damping * nextVelocity) * step
    nextSize += nextVelocity * step
  }
  return { size: nextSize, velocity: nextVelocity }
}

/** @param {{ size: number, velocity: number }} spring @param {number} target */
export const isSettled = ({ size, velocity }, target) =>
  Math.abs(target - size) < SETTLE_DISTANCE && Math.abs(velocity) < SETTLE_SPEED
