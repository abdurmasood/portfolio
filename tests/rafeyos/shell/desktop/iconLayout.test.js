import { describe, it, expect } from 'vitest'
import { iconLayout } from '@/components/rafeyos/shell/desktop/logic/iconLayout'

const area = { x: 54, y: 28, w: 1000, h: 300 }
const cell = { w: 90, h: 88 }
const paths = ['/home/visitor', 'a', 'b', 'c', 'd']

describe('iconLayout', () => {
  it('fills columns top-down from the top-left corner', () => {
    // floor((300 - 16) / 88) = 3 rows
    const layout = iconLayout(paths, area, 'tl', cell)

    expect(layout).toEqual([
      { path: '/home/visitor', x: 62, y: 36 },
      { path: 'a', x: 62, y: 124 },
      { path: 'b', x: 62, y: 212 },
      { path: 'c', x: 152, y: 36 },
      { path: 'd', x: 152, y: 124 },
    ])
  })

  it('starts from the right and bottom for other corners', () => {
    const [first, , , fourth] = iconLayout(paths, area, 'br', cell)

    expect(first).toEqual({ path: '/home/visitor', x: 54 + 1000 - 8 - 90, y: 28 + 300 - 8 - 88 })
    expect(fourth.x).toBe(54 + 1000 - 8 - 90 - 90)
  })

  it('uses the default cell size', () => {
    expect(iconLayout(['/home/visitor'], area, 'tr')[0]).toEqual({ path: '/home/visitor', x: 54 + 1000 - 8 - 90, y: 36 })
  })

  it('wraps overflowing columns back to the first column and keeps one row minimum', () => {
    const tiny = { x: 0, y: 0, w: 100, h: 50 }

    const layout = iconLayout(['a', 'b', 'c'], tiny, 'bl', cell)

    expect(layout.map((p) => p.x)).toEqual([8, 8, 8])
    expect(layout.map((p) => p.y)).toEqual([-46, -46, -46])
  })
})
