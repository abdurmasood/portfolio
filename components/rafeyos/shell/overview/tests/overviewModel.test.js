import { describe, expect, it } from 'vitest'
import { overviewTargets, overviewWindows, spreadsWindows, windowOverviewTransform, workspaceTransform } from '../js/overviewModel'
import { overviewLayout, overviewRegion } from '../../../wm/geometry'

const AREA = { x: 0, y: 28, w: 1000, h: 700 }
const win = (id, extra = {}) => ({ id, rect: { x: 10 * id, y: 40, w: 400, h: 300 }, minimized: false, phase: 'open', ...extra })

const state = {
  byId: { 1: win(1), 2: win(2, { minimized: true }), 3: win(3, { phase: 'closing' }) },
  order: [2, 1, 3],
}

describe('overview model', () => {
  it('spreads windows only in windows mode with nothing typed', () => {
    expect(spreadsWindows({ mode: 'windows', query: '' })).toBe(true)
    expect(spreadsWindows({ mode: 'windows', query: '  ' })).toBe(true)
    expect(spreadsWindows({ mode: 'windows', query: 'te' })).toBe(false)
    expect(spreadsWindows({ mode: 'apps', query: '' })).toBe(false)
    expect(spreadsWindows(null)).toBe(false)
  })

  it('includes minimized windows, skips closing ones, bottom of the stack first', () => {
    expect(overviewWindows(state).map((w) => w.id)).toEqual([2, 1])
  })

  it('places each window by overviewLayout over the overview region', () => {
    const targets = overviewTargets(state, AREA)
    const expected = overviewLayout([win(2).rect, win(1).rect], overviewRegion(AREA))

    expect([...targets.keys()]).toEqual([2, 1])
    expect(targets.get(2)).toEqual(expected[0])
    expect(targets.get(1)).toEqual(expected[1])
  })

  it('writes the transforms as CSS', () => {
    expect(windowOverviewTransform({ x: 10, y: 20, w: 1, h: 1 }, { x: 110, y: 70, scale: 0.5 })).toBe(
      'translate(100px, 50px) scale(0.5)',
    )
    expect(workspaceTransform({ x: 24, y: 86, scale: 0.75 })).toBe('translate(24px, 86px) scale(0.75)')
  })
})
