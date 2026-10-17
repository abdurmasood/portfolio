import { describe, it, expect } from 'vitest'
import {
  workArea, snapRect, snapModeAt, resizeRect, cascadeRect, clampRect, unsnapForDragRect, overviewRegion, overviewLayout,
} from './geometry'

const viewport = { w: 1280, h: 800 }
const area = { x: 54, y: 28, w: 1226, h: 772 }

describe('workArea', () => {
  it('reserves the top bar and a left dock', () => {
    expect(workArea({ viewport, dockPos: 'left', dockSize: 54 })).toEqual({ x: 54, y: 28, w: 1226, h: 772 })
  })

  it('reserves a right dock', () => {
    expect(workArea({ viewport, dockPos: 'right', dockSize: 54 })).toEqual({ x: 0, y: 28, w: 1226, h: 772 })
  })

  it('reserves a bottom dock and honours a custom top bar', () => {
    expect(workArea({ viewport, dockPos: 'bottom', dockSize: 48, topBar: 30 })).toEqual({ x: 0, y: 30, w: 1280, h: 722 })
  })
})

describe('snapRect', () => {
  it('maximizes to the whole area as a copy', () => {
    const rect = snapRect(area, 'max')

    expect(rect).toEqual(area)
    expect(rect).not.toBe(area)
  })

  it('splits odd widths so the halves meet exactly', () => {
    const odd = { x: 0, y: 28, w: 1001, h: 700 }

    const left = snapRect(odd, 'left')
    const right = snapRect(odd, 'right')

    expect(left).toEqual({ x: 0, y: 28, w: 501, h: 700 })
    expect(right).toEqual({ x: 501, y: 28, w: 500, h: 700 })
    expect(left.w + right.w).toBe(odd.w)
  })
})

describe('snapModeAt', () => {
  it.each([
    [{ x: 600, y: 30 }, 'max'],
    [{ x: 600, y: 31 }, null],
    [{ x: 57, y: 400 }, 'left'],
    [{ x: 58, y: 400 }, null],
    [{ x: 1277, y: 400 }, 'right'],
    [{ x: 1276, y: 400 }, null],
    [{ x: 54, y: 28 }, 'max'],
  ])('%o -> %s', (point, mode) => {
    expect(snapModeAt(point, area)).toBe(mode)
  })
})

describe('resizeRect', () => {
  const start = { x: 200, y: 200, w: 500, h: 400 }
  const limits = { min: [300, 200], area }

  it.each([
    ['e', { dx: 50, dy: 99 }, { x: 200, y: 200, w: 550, h: 400 }],
    ['s', { dx: 99, dy: 30 }, { x: 200, y: 200, w: 500, h: 430 }],
    ['w', { dx: 50, dy: 0 }, { x: 250, y: 200, w: 450, h: 400 }],
    ['n', { dx: 0, dy: -50 }, { x: 200, y: 150, w: 500, h: 450 }],
    ['ne', { dx: 10, dy: 10 }, { x: 200, y: 210, w: 510, h: 390 }],
    ['nw', { dx: -10, dy: -10 }, { x: 190, y: 190, w: 510, h: 410 }],
    ['se', { dx: 10, dy: 10 }, { x: 200, y: 200, w: 510, h: 410 }],
    ['sw', { dx: -10, dy: 10 }, { x: 190, y: 200, w: 510, h: 410 }],
  ])('resizes from %s', (edge, delta, expected) => {
    expect(resizeRect(start, edge, delta, limits)).toEqual(expected)
  })

  it('stops at the minimum size, keeping the opposite edge fixed', () => {
    expect(resizeRect(start, 'w', { dx: 400, dy: 0 }, limits)).toEqual({ x: 400, y: 200, w: 300, h: 400 })
    expect(resizeRect(start, 'n', { dx: 0, dy: 400 }, limits)).toEqual({ x: 200, y: 400, w: 500, h: 200 })
    expect(resizeRect(start, 'se', { dx: -400, dy: -400 }, limits)).toEqual({ x: 200, y: 200, w: 300, h: 200 })
  })

  it('never lets the top edge rise above the work area', () => {
    expect(resizeRect(start, 'n', { dx: 0, dy: -500 }, limits)).toEqual({ x: 200, y: 28, w: 500, h: 572 })
  })

  it('defaults the minimum size', () => {
    expect(resizeRect(start, 'e', { dx: -1000, dy: 0 }, { area }).w).toBe(320)
  })

  it('does not mutate the start rect', () => {
    const frozen = Object.freeze({ ...start })

    resizeRect(frozen, 'nw', { dx: 5, dy: 5 }, limits)

    expect(frozen).toEqual(start)
  })
})

describe('cascadeRect', () => {
  it('centres the second window and steps the others', () => {
    const first = cascadeRect(area, [640, 400], 0)
    const second = cascadeRect(area, [640, 400], 1)
    const third = cascadeRect(area, [640, 400], 2)

    expect(second).toEqual({ x: 347, y: 198, w: 640, h: 400 })
    expect(first).toEqual({ x: 321, y: 176, w: 640, h: 400 })
    expect(third).toEqual({ x: 373, y: 220, w: 640, h: 400 })
  })

  it('cycles every five windows', () => {
    expect(cascadeRect(area, [640, 400], 6)).toEqual(cascadeRect(area, [640, 400], 1))
  })

  it('shrinks to fit a small area and stays inside it', () => {
    const small = { x: 0, y: 28, w: 400, h: 300 }

    const rect = cascadeRect(small, [760, 480], 0)

    expect(rect).toEqual({ x: 0, y: 28, w: 376, h: 276 })
  })
})

describe('clampRect', () => {
  it('pulls a window back so part of it stays visible', () => {
    expect(clampRect({ x: 2000, y: 2000, w: 400, h: 300 }, area)).toEqual({ x: 1160, y: 740, w: 400, h: 300 })
    expect(clampRect({ x: -50, y: 0, w: 400, h: 300 }, area)).toEqual({ x: 54, y: 28, w: 400, h: 300 })
  })

  it('shrinks oversized windows to the area', () => {
    expect(clampRect({ x: 54, y: 28, w: 5000, h: 5000 }, area)).toEqual({ x: 54, y: 28, w: 1226, h: 772 })
  })
})

describe('unsnapForDragRect', () => {
  it('keeps the pointer at the same fraction of the restored width', () => {
    const current = { x: 54, y: 28, w: 1226, h: 772 }
    const prev = { x: 300, y: 200, w: 600, h: 400 }
    const pointerX = 54 + 1226 * 0.25

    const rect = unsnapForDragRect(current, prev, pointerX, area)

    expect(rect).toEqual({ x: pointerX - 150, y: 28, w: 600, h: 400 })
  })
})

describe('overview', () => {
  it('insets the region from the work area', () => {
    expect(overviewRegion(area)).toEqual({ x: 104, y: 68, w: 1126, h: 682 })
  })

  it('lays windows out in a grid, never scaling up', () => {
    const region = { x: 0, y: 0, w: 1000, h: 600 }
    const rects = [{ x: 0, y: 0, w: 100, h: 100 }, { x: 0, y: 0, w: 2000, h: 1000 }, { x: 0, y: 0, w: 500, h: 500 }]

    const layout = overviewLayout(rects, region)

    expect(layout).toHaveLength(3)
    expect(layout[0].scale).toBe(1)
    expect(layout[1].scale).toBeCloseTo(Math.min(1, (500 * 0.86) / 2000, (300 * 0.78) / 1000))
    layout.forEach(({ x, y, scale }, i) => {
      expect(x).toBeGreaterThanOrEqual(region.x)
      expect(y).toBeGreaterThanOrEqual(region.y)
      expect(x + rects[i].w * scale).toBeLessThanOrEqual(region.x + region.w)
    })
    expect(layout[2].y).toBeGreaterThan(layout[0].y)
  })

  it('centres a window in its grid cell (a wide region gets two columns, as in the mockup)', () => {
    const [only] = overviewLayout([{ x: 0, y: 0, w: 200, h: 100 }], { x: 0, y: 0, w: 1000, h: 600 })

    expect(only).toEqual({ x: 150, y: 250, scale: 1 })
  })

  it('returns nothing for no windows', () => {
    expect(overviewLayout([], { x: 0, y: 0, w: 1000, h: 600 })).toEqual([])
  })
})
