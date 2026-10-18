import { describe, expect, it } from 'vitest'
import { computeLayout, COMPACT_ICON_SIZE } from '../js/layout'

describe('layout', () => {
  it('puts the dock where settings say on wide screens', () => {
    const layout = computeLayout({ w: 1280, h: 800 }, { dockPos: 'left', iconSize: 40 })

    expect(layout).toMatchObject({ compact: false, dockPos: 'left', iconSize: 40, dockSize: 54 })
    expect(layout.area).toEqual({ x: 54, y: 28, w: 1226, h: 772 })
  })

  it('moves the dock to the bottom with smaller icons when compact', () => {
    const layout = computeLayout({ w: 400, h: 800 }, { dockPos: 'left', iconSize: 40 })

    expect(layout).toMatchObject({ compact: true, dockPos: 'bottom', iconSize: COMPACT_ICON_SIZE })
    expect(layout.area).toEqual({ x: 0, y: 28, w: 400, h: 724 })
  })
})
