import { describe, expect, it } from 'vitest'
import { startDrag, startResize, stepDrag, stepResize, DRAG_THRESHOLD } from '@/components/rafeyos/wm/gestures'
import { SNAP_MODES } from '@/components/rafeyos/wm/geometry'

const area = { x: 54, y: 28, w: 970, h: 740 }
const normal = { id: 1, rect: { x: 200, y: 100, w: 400, h: 300 }, prevRect: null, mode: SNAP_MODES.NORMAL }

describe('drag gesture', () => {
  it('stays put until the pointer passes the threshold', () => {
    const drag = startDrag(normal, { x: 300, y: 150 }, area)

    const next = stepDrag(drag, { x: 300 + DRAG_THRESHOLD - 1, y: 150 })

    expect(next).toBe(drag)
    expect(next.moved).toBe(false)
  })

  it('moves by the pointer travel and never above the work area', () => {
    const drag = startDrag(normal, { x: 300, y: 150 }, area)

    const next = stepDrag(drag, { x: 340, y: 10 })

    expect(next.rect).toEqual({ x: 240, y: area.y, w: 400, h: 300 })
    expect(next.moved).toBe(true)
    expect(next.unsnapped).toBeNull()
  })

  it('reports the snap mode under the pointer', () => {
    const drag = startDrag(normal, { x: 300, y: 150 }, area)

    expect(stepDrag(drag, { x: 300, y: area.y }).mode).toBe(SNAP_MODES.MAX)
    expect(stepDrag(drag, { x: area.x, y: 300 }).mode).toBe(SNAP_MODES.LEFT)
    expect(stepDrag(drag, { x: 400, y: 300 }).mode).toBeNull()
  })

  it('unsnaps a maximized window once, keeping the grab ratio', () => {
    const maxed = { ...normal, rect: { ...area }, prevRect: { x: 0, y: 0, w: 400, h: 300 }, mode: SNAP_MODES.MAX }
    const drag = startDrag(maxed, { x: 539, y: 40 }, area)

    const first = stepDrag(drag, { x: 539, y: 60 })
    const second = stepDrag(first, { x: 549, y: 70 })

    expect(first.unsnapped).toEqual({ x: 339, y: area.y, w: 400, h: 300 })
    expect(first.rect).toEqual({ x: 339, y: 48, w: 400, h: 300 })
    expect(second.unsnapped).toBeNull()
    expect(second.rect.x).toBe(349)
  })
})

describe('resize gesture', () => {
  it('grows from a corner and respects the minimum size', () => {
    const resize = startResize(normal, { x: 600, y: 400 }, { edge: 'se', min: [360, 200], area })

    expect(stepResize(resize, { x: 650, y: 420 }).rect).toEqual({ x: 200, y: 100, w: 450, h: 320 })
    expect(stepResize(resize, { x: 0, y: 0 }).rect).toEqual({ x: 200, y: 100, w: 360, h: 200 })
  })

  it('moves the left edge without moving the right one', () => {
    const resize = startResize(normal, { x: 200, y: 200 }, { edge: 'w', min: [100, 100], area })

    const { rect } = stepResize(resize, { x: 150, y: 200 })

    expect(rect.x + rect.w).toBe(normal.rect.x + normal.rect.w)
    expect(rect.w).toBe(450)
  })
})
