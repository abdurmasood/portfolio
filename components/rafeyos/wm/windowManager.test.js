import { describe, expect, it, vi } from 'vitest'
import { createWindowManager } from './windowManager'
import { initialWindows, windowsReducer } from '../state/windowsReducer'
import { SNAP_MODES } from './geometry'
import { realVfs } from '../vfs/testVfs'

const layout = { area: { x: 54, y: 28, w: 970, h: 740 }, compact: false }

/** A manager over a real reducer, so commands are checked by the state they produce. */
const setup = () => {
  let state = initialWindows
  const dispatch = vi.fn((action) => {
    state = windowsReducer(state, action)
  })
  const wm = createWindowManager({ dispatch, getState: () => state, getLayout: () => layout, vfs: realVfs })
  return { wm, dispatch, state: () => state }
}

describe('window manager', () => {
  it('opens implemented apps with their registry size and name', () => {
    const { wm, state } = setup()

    expect(wm.openApp('files', { path: '~/blog' })).toBe(true)

    const [win] = Object.values(state().byId)
    expect(win).toMatchObject({ appId: 'files', arg: '~/blog', title: 'Files', mode: SNAP_MODES.NORMAL })
    expect(win.rect.w).toBe(760)
  })

  it('refuses apps without a UI yet', () => {
    const { wm, dispatch } = setup()

    expect(wm.openApp('editor', { path: '~/bio.txt' })).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('remembers the launcher rect until the window is removed', () => {
    const { wm } = setup()
    const from = { x: 1, y: 2, w: 3, h: 4 }

    wm.openApp('terminal', { from })

    expect(wm.openOrigin(1)).toEqual(from)
    wm.remove(1)
    expect(wm.openOrigin(1)).toBeNull()
  })

  it('opens folders (through links) in Files but not other files', () => {
    const { wm, state } = setup()

    expect(wm.openPath('~/Desktop/projects')).toBe(true)
    expect(wm.openPath('~/bio.txt')).toBe(false)

    expect(Object.values(state().byId).map((win) => win.arg)).toEqual(['~/projects'])
  })

  it('toggles maximize and back', () => {
    const { wm, state } = setup()
    wm.openApp('files')

    wm.toggleMax(1)
    expect(state().byId[1].mode).toBe(SNAP_MODES.MAX)
    wm.toggleMax(1)
    expect(state().byId[1].mode).toBe(SNAP_MODES.NORMAL)
    wm.toggleMax(99)
  })

  it('only dispatches a title when it changes', () => {
    const { wm, dispatch } = setup()
    wm.openApp('files')
    dispatch.mockClear()

    wm.setTitle(1, 'Home')
    wm.setTitle(1, 'Home')

    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  describe('dock activation', () => {
    it('launches, then minimizes the focused app, then restores it', () => {
      const { wm, state } = setup()

      wm.activateApp('files', null)
      expect(state().focusedId).toBe(1)

      wm.activateApp('files', null)
      expect(state().byId[1].minimized).toBe(true)

      wm.activateApp('files', null)
      expect(state().byId[1].minimized).toBe(false)
      expect(state().focusedId).toBe(1)
    })

    it('raises every window of an unfocused app, ending on its top one', () => {
      const { wm, state } = setup()
      wm.openApp('files')
      wm.openApp('files')
      wm.openApp('terminal')

      wm.activateApp('files', null)

      expect(state().focusedId).toBe(2)
      expect(state().order.slice(-2)).toEqual([1, 2])
    })
  })

  it('exposes a snap preview store', () => {
    const { wm } = setup()
    const listener = vi.fn()
    wm.snapPreview.subscribe(listener)

    wm.snapPreview.set(SNAP_MODES.LEFT)
    wm.snapPreview.set(SNAP_MODES.LEFT)

    expect(wm.snapPreview.get()).toBe(SNAP_MODES.LEFT)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
