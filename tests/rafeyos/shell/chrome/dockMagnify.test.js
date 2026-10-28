import { describe, expect, it } from 'vitest'
import { MAX_FRAME, STEP, isSettled, stepSpring, targetSize, targetSizes } from '@/components/rafeyos/shell/chrome/logic/dockMagnify'

const REST = 46

/** Runs the spring at 60 fps until it settles, recording every size. */
const settle = (from, target) => {
  let spring = { size: from, velocity: 0 }
  const sizes = []
  for (let frame = 0; frame < 600 && !isSettled(spring, target); frame++) {
    spring = stepSpring(spring, target, 1 / 60)
    sizes.push(spring.size)
  }
  return { spring, sizes }
}

describe('dock magnify', () => {
  it('sizes the hovered icon, its neighbours and the next ones like the macOS dock', () => {
    const sizes = Array.from({ length: 11 }, (_, index) => Math.round(targetSize(index, 5, REST)))

    expect(sizes).toEqual([46, 46, 46, 56, 67, 79, 67, 56, 46, 46, 46])
  })

  it('keeps every icon at rest when nothing is hovered', () => {
    expect(targetSize(3, -1, REST)).toBe(REST)
  })

  it('swells only the hovered group', () => {
    const sizes = targetSizes([['files', 'terminal', 'settings'], ['trash', 'apps']], 'settings', REST)

    expect(sizes.get('settings')).toBeCloseTo(REST * 1.72)
    expect(sizes.get('files')).toBeCloseTo(REST * 1.22)
    expect(sizes.get('trash')).toBe(REST)
    expect(sizes.get('apps')).toBe(REST)
  })

  it('rests every key when the hover is cleared', () => {
    const sizes = targetSizes([['files', 'terminal'], ['trash']], null, REST)

    expect([...sizes.values()]).toEqual([REST, REST, REST])
  })

  it('overshoots a little, then settles on the target', () => {
    const target = REST * 1.72

    const { spring, sizes } = settle(REST, target)

    expect(Math.max(...sizes)).toBeGreaterThan(target)
    expect(Math.max(...sizes)).toBeLessThan(target + 5)
    expect(isSettled(spring, target)).toBe(true)
  })

  it('moves the same whatever the frame rate', () => {
    const start = { size: REST, velocity: 0 }

    const oneFrame = stepSpring(start, 79, 4 * STEP)
    let fourFrames = start
    for (let frame = 0; frame < 4; frame++) fourFrames = stepSpring(fourFrames, 79, STEP)

    expect(oneFrame.size).toBeCloseTo(fourFrames.size, 6)
    expect(oneFrame.velocity).toBeCloseTo(fourFrames.velocity, 6)
  })

  it('caps a long gap between frames', () => {
    const start = { size: REST, velocity: 0 }

    expect(stepSpring(start, 79, 5)).toEqual(stepSpring(start, 79, MAX_FRAME))
  })

  it('is not settled while still moving fast near the target', () => {
    expect(isSettled({ size: 79, velocity: 10 }, 79)).toBe(false)
    expect(isSettled({ size: 78, velocity: 0 }, 79)).toBe(false)
  })
})
