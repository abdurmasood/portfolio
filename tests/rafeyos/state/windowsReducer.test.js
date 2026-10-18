import { describe, it, expect } from 'vitest'
import { windowsReducer, initialWindows } from '@/components/rafeyos/state/windowsReducer'
import { cascadeRect, snapRect } from '@/components/rafeyos/wm/geometry'
import { deepFreeze } from '@/components/rafeyos/vfs/content'

const area = { x: 54, y: 28, w: 1226, h: 772 }
const size = [640, 400]

// Every reducer call goes through a deep-frozen state: any mutation throws in strict mode
const reduce = (state, ...actions) =>
  actions.reduce((current, action) => windowsReducer(deepFreeze(current), deepFreeze(action)), state)

const openTerminal = { type: 'open', appId: 'terminal', multi: true, size, area, title: 'Terminal' }
const openEditor = (arg) => ({ type: 'open', appId: 'editor', arg, size, area })

describe('open', () => {
  it('opens a focused window on top, cascaded', () => {
    const state = reduce(initialWindows, openTerminal)

    expect(state.order).toEqual([1])
    expect(state.focusedId).toBe(1)
    expect(state.nextId).toBe(2)
    expect(state.byId[1]).toEqual({
      id: 1, key: 'terminal#1', appId: 'terminal', arg: '', init: null, title: 'Terminal', rect: cascadeRect(area, size, 0),
      prevRect: null, mode: 'normal', minimized: false, phase: 'open',
    })
  })

  it('cascades each visible window to the next step', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal)

    expect(state.byId[2].rect).toEqual(cascadeRect(area, size, 1))
    expect(state.byId[2].key).toBe('terminal#2')
  })

  it('does not count minimized windows when cascading', () => {
    const state = reduce(initialWindows, openTerminal, { type: 'minimize', id: 1 }, openTerminal)

    expect(state.byId[2].rect).toEqual(cascadeRect(area, size, 0))
  })

  it('defaults the title to the app id', () => {
    expect(reduce(initialWindows, openEditor('~/bio.txt')).byId[1].title).toBe('editor')
  })

  it('reuses a single-instance window with the same arg, focusing it', () => {
    const state = reduce(initialWindows, openEditor('~/bio.txt'), openTerminal, openEditor('~/bio.txt'))

    expect(Object.keys(state.byId)).toHaveLength(2)
    expect(state.order).toEqual([2, 1])
    expect(state.focusedId).toBe(1)
  })

  it('restores a minimized single-instance window instead of opening another', () => {
    const state = reduce(initialWindows, openEditor('~/bio.txt'), { type: 'minimize', id: 1 }, openEditor('~/bio.txt'))

    expect(state.byId[1].minimized).toBe(false)
    expect(state.focusedId).toBe(1)
  })

  it('hands new launch options to a reused window, keeping the old ones otherwise', () => {
    const openSettings = (init) => ({ type: 'open', appId: 'settings', size, area, init })
    const first = reduce(initialWindows, openSettings({ page: 'appearance' }))

    const relaunched = reduce(first, openSettings({ page: 'sound' }))
    const plain = reduce(relaunched, openSettings(null))

    expect(Object.keys(relaunched.byId)).toHaveLength(1)
    expect(relaunched.byId[1].init).toEqual({ page: 'sound' })
    expect(relaunched.byId[1].init).not.toBe(first.byId[1].init)
    expect(plain.byId[1].init).toBe(relaunched.byId[1].init)
  })

  it('opens a fresh window when the existing one is closing', () => {
    const state = reduce(initialWindows, openEditor('~/bio.txt'), { type: 'requestClose', id: 1 }, openEditor('~/bio.txt'))

    expect(state.byId[2].key).toBe('editor:~/bio.txt')
    expect(state.focusedId).toBe(2)
  })

  it('opens a different arg as its own window', () => {
    const state = reduce(initialWindows, openEditor('~/bio.txt'), openEditor('~/skills.txt'))

    expect(state.order).toEqual([1, 2])
  })

  it('opens maximized when compact, remembering the cascade rect', () => {
    const state = reduce(initialWindows, { ...openTerminal, compact: true })

    expect(state.byId[1]).toMatchObject({ mode: 'max', rect: area, prevRect: cascadeRect(area, size, 0) })
  })
})

describe('focus and z-order', () => {
  it('raises the focused window to the top', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, openTerminal, { type: 'focus', id: 1 })

    expect(state.order).toEqual([2, 3, 1])
    expect(state.focusedId).toBe(1)
  })

  it('focus(null) clears focus without reordering', () => {
    const state = reduce(initialWindows, openTerminal, { type: 'focus', id: null })

    expect(state.focusedId).toBeNull()
    expect(state.order).toEqual([1])
  })

  it('ignores unknown ids and unknown actions', () => {
    const state = reduce(initialWindows, openTerminal)

    ;['focus', 'minimize', 'restore', 'requestClose', 'remove', 'snap', 'unsnap', 'commitRect', 'setTitle', 'setArg'].forEach((type) => {
      expect(windowsReducer(state, { type, id: 99, area, mode: 'max', rect: area, title: 'x' })).toBe(state)
    })
    expect(windowsReducer(state, { type: 'nope' })).toBe(state)
  })
})

describe('minimize and restore', () => {
  it('minimizing the focused window refocuses the top visible one', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, openTerminal, { type: 'minimize', id: 2 }, { type: 'minimize', id: 3 })

    expect(state.byId[3].minimized).toBe(true)
    expect(state.focusedId).toBe(1)
  })

  it('minimizing an unfocused window keeps focus', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, { type: 'minimize', id: 1 })

    expect(state.focusedId).toBe(2)
  })

  it('minimizing the last window leaves nothing focused; minimizing twice is a no-op', () => {
    const once = reduce(initialWindows, openTerminal, { type: 'minimize', id: 1 })

    expect(once.focusedId).toBeNull()
    expect(windowsReducer(once, { type: 'minimize', id: 1 })).toBe(once)
  })

  it('restore unminimizes, raises and focuses', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, { type: 'minimize', id: 1 }, { type: 'restore', id: 1 })

    expect(state.byId[1].minimized).toBe(false)
    expect(state.order).toEqual([2, 1])
    expect(state.focusedId).toBe(1)
  })
})

describe('two-phase close', () => {
  it('requestClose marks the window closing and passes focus on', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, { type: 'requestClose', id: 2 })

    expect(state.byId[2].phase).toBe('closing')
    expect(state.focusedId).toBe(1)
  })

  it('remove deletes the window and its z-order entry', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, { type: 'requestClose', id: 2 }, { type: 'remove', id: 2 })

    expect(state.byId[2]).toBeUndefined()
    expect(state.order).toEqual([1])
    expect(state.focusedId).toBe(1)
  })

  it('remove of the focused window refocuses the top one', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, { type: 'remove', id: 2 })

    expect(state.focusedId).toBe(1)
  })

  it('remove of an unfocused window keeps focus', () => {
    const state = reduce(initialWindows, openTerminal, openTerminal, { type: 'remove', id: 1 })

    expect(state.focusedId).toBe(2)
  })
})

describe('snap and unsnap', () => {
  it('snap stores the normal rect as prevRect', () => {
    const before = reduce(initialWindows, openTerminal)

    const state = reduce(before, { type: 'snap', id: 1, mode: 'left', area })

    expect(state.byId[1]).toMatchObject({ mode: 'left', rect: snapRect(area, 'left'), prevRect: before.byId[1].rect })
  })

  it('snapping an already snapped window keeps the original prevRect', () => {
    const before = reduce(initialWindows, openTerminal)

    const state = reduce(before, { type: 'snap', id: 1, mode: 'left', area }, { type: 'snap', id: 1, mode: 'max', area })

    expect(state.byId[1]).toMatchObject({ mode: 'max', prevRect: before.byId[1].rect })
  })

  it('unsnap restores prevRect', () => {
    const before = reduce(initialWindows, openTerminal)

    const state = reduce(before, { type: 'snap', id: 1, mode: 'max', area }, { type: 'unsnap', id: 1 })

    expect(state.byId[1]).toMatchObject({ mode: 'normal', rect: before.byId[1].rect })
  })

  it('unsnap can place the window at a drag rect', () => {
    const dragRect = { x: 10, y: 28, w: 640, h: 400 }

    const state = reduce(initialWindows, openTerminal, { type: 'snap', id: 1, mode: 'max', area }, { type: 'unsnap', id: 1, rect: dragRect })

    expect(state.byId[1].rect).toEqual(dragRect)
  })

  it('unsnap of a normal window is a no-op', () => {
    const state = reduce(initialWindows, openTerminal)

    expect(windowsReducer(state, { type: 'unsnap', id: 1 })).toBe(state)
  })
})

describe('commitRect and setTitle', () => {
  it('commitRect stores a free rect', () => {
    const rect = { x: 100, y: 100, w: 500, h: 300 }

    const state = reduce(initialWindows, openTerminal, { type: 'commitRect', id: 1, rect })

    expect(state.byId[1]).toMatchObject({ rect, mode: 'normal' })
  })

  it('setTitle renames the window', () => {
    const state = reduce(initialWindows, openTerminal, { type: 'setTitle', id: 1, title: 'visitor@rafey: ~/Music' })

    expect(state.byId[1].title).toBe('visitor@rafey: ~/Music')
  })

  it('setArg retargets a window and refuses a file another window has open', () => {
    const moved = reduce(initialWindows, openEditor(''), { type: 'setArg', id: 1, arg: '~/Documents/notes.txt' })

    expect(moved.byId[1]).toMatchObject({ arg: '~/Documents/notes.txt', key: 'editor:~/Documents/notes.txt' })

    const blocked = reduce(moved, openEditor(''), { type: 'setArg', id: 2, arg: '~/Documents/notes.txt' })

    expect(blocked.byId[2].arg).toBe('')
    expect(blocked.byId[2].key).toBe('editor:')
  })
})

describe('relayout', () => {
  const smaller = { x: 0, y: 28, w: 700, h: 500 }

  it('re-snaps snapped windows and clamps the rest', () => {
    const state = reduce(
      initialWindows,
      openTerminal,
      openTerminal,
      { type: 'commitRect', id: 1, rect: { x: 1100, y: 700, w: 900, h: 300 } },
      { type: 'snap', id: 2, mode: 'right', area },
      { type: 'relayout', area: smaller },
    )

    expect(state.byId[1].rect).toEqual({ x: 580, y: 468, w: 700, h: 300 })
    expect(state.byId[2].rect).toEqual(snapRect(smaller, 'right'))
  })

  it('maximizes normal windows when compact', () => {
    const state = reduce(initialWindows, openTerminal, { type: 'relayout', area: smaller, compact: true })

    expect(state.byId[1]).toMatchObject({ mode: 'max', rect: smaller })
    expect(state.byId[1].prevRect).not.toBeNull()
  })
})
