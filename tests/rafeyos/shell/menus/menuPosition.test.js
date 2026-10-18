import { describe, it, expect } from 'vitest'
import { menuPosition } from '@/components/rafeyos/shell/menus/js/menuPosition'

const viewport = { w: 1000, h: 700 }
const size = { w: 200, h: 150 }

describe('menuPosition', () => {
  it('places the menu at the point when it fits', () => {
    expect(menuPosition({ x: 100, y: 100 }, size, viewport)).toEqual({ left: 100, top: 100 })
  })

  it('pulls the menu back inside the right and bottom edges', () => {
    expect(menuPosition({ x: 950, y: 650 }, size, viewport)).toEqual({ left: 794, top: 544 })
  })

  it('keeps the menu off the left edge and below the top bar', () => {
    expect(menuPosition({ x: -20, y: 0 }, size, viewport)).toEqual({ left: 6, top: 34 })
    expect(menuPosition({ x: 0, y: 0 }, size, viewport, { minTop: 50 })).toEqual({ left: 6, top: 50 })
  })

  it('anchors the menu bottom at the point for dock menus', () => {
    expect(menuPosition({ x: 300, y: 650 }, size, viewport, { anchorBottom: true })).toEqual({ left: 300, top: 500 })
    expect(menuPosition({ x: 300, y: 100 }, size, viewport, { anchorBottom: true })).toEqual({ left: 300, top: 34 })
  })
})
