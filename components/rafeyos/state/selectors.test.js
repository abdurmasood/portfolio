import { describe, it, expect } from 'vitest'
import { topWindow, windowsForApp, runningApps, zIndexOf } from './selectors'
import { windowsReducer, initialWindows } from './windowsReducer'

const area = { x: 0, y: 28, w: 1200, h: 700 }
const open = (appId, arg = '') => ({ type: 'open', appId, arg, multi: appId === 'terminal', size: [400, 300], area })
const build = (...actions) => actions.reduce(windowsReducer, initialWindows)

describe('selectors', () => {
  it('topWindow skips minimized and closing windows', () => {
    const state = build(open('terminal'), open('files'), open('music'), { type: 'minimize', id: 3 }, { type: 'requestClose', id: 2 })

    expect(topWindow(state).id).toBe(1)
  })

  it('topWindow is null with nothing shown', () => {
    expect(topWindow(initialWindows)).toBeNull()
  })

  it('windowsForApp returns live windows of one app in stacking order', () => {
    const state = build(open('terminal'), open('files'), open('terminal'), open('terminal'), { type: 'focus', id: 1 }, { type: 'requestClose', id: 4 })

    expect(windowsForApp(state, 'terminal').map((w) => w.id)).toEqual([3, 1])
  })

  it('runningApps lists each live app once, minimized included, in open order', () => {
    const state = build(open('music'), open('terminal'), open('terminal'), open('files'), { type: 'minimize', id: 1 }, { type: 'requestClose', id: 4 }, { type: 'focus', id: 2 })

    expect(runningApps(state)).toEqual(['music', 'terminal'])
  })

  it('zIndexOf follows the stacking order', () => {
    const state = build(open('terminal'), open('terminal'), { type: 'focus', id: 1 })

    expect(zIndexOf(state, 2)).toBe(10)
    expect(zIndexOf(state, 1)).toBe(11)
    expect(zIndexOf(state, 99)).toBeNull()
  })
})
