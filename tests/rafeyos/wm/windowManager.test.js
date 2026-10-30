import { describe, expect, it, vi } from 'vitest'
import { createWindowManager } from '@/components/rafeyos/wm/logic/windowManager'
import { initialWindows, windowsReducer } from '@/components/rafeyos/state/logic/windowsReducer'
import { SNAP_MODES } from '@/components/rafeyos/core/geometry'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'
import { mergeState, saveFile, seedState } from '@/components/rafeyos/core/vfs/fsState'

const layout = { area: { x: 54, y: 28, w: 970, h: 740 }, compact: false }

/** A manager over a real reducer, so commands are checked by the state they produce. */
const setup = () => {
  let state = initialWindows
  const dispatch = vi.fn((action) => {
    state = windowsReducer(state, action)
  })
  const wm = createWindowManager({ dispatch, getState: () => state, getLayout: () => layout, getVfs: () => realVfs })
  return { wm, dispatch, state: () => state }
}

describe('window manager', () => {
  it('opens implemented apps with their registry size and name', () => {
    const { wm, state } = setup()

    expect(wm.openApp('files', { path: '/home/rafey/blog' })).toBe(true)

    const [win] = Object.values(state().byId)
    expect(win).toMatchObject({ appId: 'files', arg: '/home/rafey/blog', title: 'Files', mode: SNAP_MODES.NORMAL })
    expect(win.rect.w).toBe(760)
  })

  it('refuses apps without a UI yet', () => {
    const { wm, dispatch } = setup()

    expect(wm.openApp('nope')).toBe(false)
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

  it('opens each file in its app', () => {
    const { wm, state } = setup()

    expect(wm.openPath('/home/rafey/projects')).toBe(true)
    expect(wm.openPath('/home/rafey/bio.txt')).toBe(true)
    expect(wm.openPath('/home/rafey/contact/email.desktop')).toBe(true)
    expect(wm.openPath('/home/rafey/Music/storms-ahead.mp3')).toBe(true)

    const opened = Object.values(state().byId).map((win) => [win.appId, win.arg])
    expect(opened).toEqual([['files', '/home/rafey/projects'], ['editor', '/home/rafey/bio.txt'], ['mail', ''], ['music', '']])
  })

  it('opens a path from the filesystem as it is now', () => {
    let vfs = realVfs
    let state = initialWindows
    const wm = createWindowManager({
      dispatch: (action) => {
        state = windowsReducer(state, action)
      },
      getState: () => state,
      getLayout: () => layout,
      getVfs: () => vfs,
    })

    vfs = mergeState(realVfs, saveFile(seedState(0), '/home/visitor/Documents', 'notes', 'hello\n', 0).state)

    expect(wm.openPath('/home/visitor/Documents/notes.txt')).toBe(true)
    expect(state.byId[1].arg).toBe('/home/visitor/Documents/notes.txt')
  })

  it('opens a path from the tree it is handed, ahead of the one it reads', () => {
    const { wm, state } = setup()
    const vfs = mergeState(realVfs, saveFile(seedState(0), '/home/visitor/Documents', 'fresh', 'hi\n', 0).state)

    expect(wm.openPath('/home/visitor/Documents/fresh.txt')).toBe(false)
    expect(wm.openPath('/home/visitor/Documents/fresh.txt', { vfs })).toBe(true)
    expect(state().byId[1].arg).toBe('/home/visitor/Documents/fresh.txt')
  })

  it('leaves web links, missing paths and unbuilt apps to the caller', () => {
    const { wm, dispatch } = setup()

    expect(wm.openPath('/home/rafey/contact/linkedin.desktop')).toBe(false)
    expect(wm.openPath('/home/rafey/nope')).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('opens the blank editor once, and a named file beside it', () => {
    const { wm, state } = setup()

    wm.openApp('editor')
    wm.openApp('editor')
    wm.openApp('editor', { path: '/home/rafey/README.txt' })

    expect(Object.values(state().byId).map((win) => win.arg)).toEqual(['', '/home/rafey/README.txt'])
  })

  it('lets a close guard keep the window open', () => {
    const { wm, state } = setup()
    wm.openApp('files')
    wm.setCloseGuard(1, () => false)

    wm.close(1)
    expect(state().byId[1].phase).toBe('open')

    wm.setCloseGuard(1, null)
    wm.close(1)
    expect(state().byId[1].phase).toBe('closing')
  })

  it('runs the follow-up after a close the guard allows, and skips it when the guard blocks', () => {
    const { wm, state } = setup()
    const next = vi.fn()
    wm.openApp('files')
    wm.setCloseGuard(1, (follow) => {
      expect(follow).toBe(next)
      return false
    })

    wm.close(1, next)
    expect(state().byId[1].phase).toBe('open')
    expect(next).not.toHaveBeenCalled()

    wm.setCloseGuard(1, null)
    wm.close(1, next)
    expect(state().byId[1].phase).toBe('closing')
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('lists live windows by id with the next id, for ps', () => {
    const { wm } = setup()
    wm.openApp('terminal')
    wm.openApp('files')
    wm.openApp('editor')
    wm.minimize(2)
    wm.close(1)

    expect(wm.list()).toEqual({ windows: [{ id: 2, appId: 'files' }, { id: 3, appId: 'editor' }], nextId: 4 })
  })

  it('force-closes past a guard and drops it', () => {
    const { wm, state } = setup()
    const guard = vi.fn(() => false)
    wm.openApp('files')
    wm.setCloseGuard(1, guard)

    wm.forceClose(1)

    expect(guard).not.toHaveBeenCalled()
    expect(state().byId[1].phase).toBe('closing')
  })

  it('passes launch options to the new window', () => {
    const { wm, state } = setup()

    wm.openApp('files', { path: '/home/visitor', init: { select: '/home/rafey/bio.txt' } })

    expect(state().byId[1].init).toEqual({ select: '/home/rafey/bio.txt' })
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
