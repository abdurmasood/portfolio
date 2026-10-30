import { describe, expect, it } from 'vitest'
import { popoverPosition } from '@/components/rafeyos/ui/popups/logic/popoverPosition'

const viewport = { w: 1000, h: 700 }
const size = { w: 300, h: 120 }

describe('popoverPosition', () => {
  it('centres under the anchor with the arrow at its middle', () => {
    expect(popoverPosition({ x: 400, y: 100, w: 100, h: 80 }, size, viewport)).toEqual({ left: 300, top: 190, above: false, arrowX: 150 })
  })

  it('treats a point as an anchor with no size', () => {
    expect(popoverPosition({ x: 500, y: 300, w: 0, h: 0 }, size, viewport)).toMatchObject({ left: 350, top: 310, arrowX: 150 })
  })

  it('stays inside the viewport, keeping the arrow on the anchor and off the corners', () => {
    expect(popoverPosition({ x: 900, y: 100, w: 10, h: 10 }, size, viewport)).toMatchObject({ left: 694, arrowX: 211 })
    expect(popoverPosition({ x: 980, y: 100, w: 10, h: 10 }, size, viewport)).toMatchObject({ left: 694, arrowX: 284 })
    expect(popoverPosition({ x: 0, y: 100, w: 10, h: 10 }, size, viewport)).toMatchObject({ left: 6, arrowX: 16 })
  })

  it('flips above the anchor when there is no room below', () => {
    expect(popoverPosition({ x: 400, y: 620, w: 100, h: 60 }, size, viewport)).toEqual({ left: 300, top: 490, above: true, arrowX: 150 })
  })
})
