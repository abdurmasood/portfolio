import { describe, it, expect } from 'vitest'
import { filesReducer, initialFilesState } from '@/components/rafeyos/apps/files/logic/filesReducer'
import { deepFreeze } from '@/components/rafeyos/core/vfs/content'

const reduce = (state, ...actions) => actions.reduce((s, a) => filesReducer(deepFreeze(s), a), state)

describe('filesReducer', () => {
  it('starts at home in grid view, or at a given path and selection', () => {
    expect(initialFilesState()).toEqual({ path: '/home/visitor', back: [], fwd: [], view: 'grid', selection: [], search: null })
    expect(initialFilesState('/home/rafey/Music', ['/home/rafey/Music/story.txt'])).toMatchObject({ path: '/home/rafey/Music', selection: ['/home/rafey/Music/story.txt'] })
  })

  it('go pushes history, clears forward, search and selection', () => {
    const state = reduce(initialFilesState(), { type: 'select', path: '/home/rafey/bio.txt' }, { type: 'go', path: '/home/rafey/Music' })

    expect(state).toMatchObject({ path: '/home/rafey/Music', back: ['/home/visitor'], fwd: [], selection: [], search: null })
  })

  it('go to the current folder is a no-op unless searching', () => {
    const start = initialFilesState()
    const searching = reduce(start, { type: 'setSearch', query: 'bio' })

    expect(filesReducer(start, { type: 'go', path: '/home/visitor' })).toBe(start)
    expect(reduce(searching, { type: 'go', path: '/home/visitor' })).toMatchObject({ search: null, back: ['/home/visitor'] })
  })

  it('go fromHistory does not touch history', () => {
    const state = reduce(initialFilesState(), { type: 'go', path: '/home/rafey/blog', fromHistory: true })

    expect(state).toMatchObject({ path: '/home/rafey/blog', back: [], fwd: [] })
  })

  it('back and forward walk the history', () => {
    const there = reduce(initialFilesState(), { type: 'go', path: '/home/rafey/Music' }, { type: 'go', path: '/home/rafey/blog' })

    const back = reduce(there, { type: 'back' })
    const forward = reduce(back, { type: 'forward' })

    expect(back).toMatchObject({ path: '/home/rafey/Music', back: ['/home/visitor'], fwd: ['/home/rafey/blog'] })
    expect(forward).toMatchObject({ path: '/home/rafey/blog', back: ['/home/visitor', '/home/rafey/Music'], fwd: [] })
  })

  it('back and forward with empty history are no-ops', () => {
    const start = initialFilesState()

    expect(filesReducer(start, { type: 'back' })).toBe(start)
    expect(filesReducer(start, { type: 'forward' })).toBe(start)
  })

  it('setView switches views and rejects unknown ones', () => {
    expect(reduce(initialFilesState(), { type: 'setView', view: 'list' }).view).toBe('list')
    expect(() => filesReducer(initialFilesState(), { type: 'setView', view: 'columns' })).toThrow('Unknown view')
  })

  it('select replaces, toggles and clears', () => {
    const single = reduce(initialFilesState(), { type: 'select', path: 'a' }, { type: 'select', path: 'b', mode: 'single' })
    const toggled = reduce(single, { type: 'select', path: 'c', mode: 'toggle' })
    const untoggled = reduce(toggled, { type: 'select', path: 'b', mode: 'toggle' })

    expect(single.selection).toEqual(['b'])
    expect(toggled.selection).toEqual(['b', 'c'])
    expect(untoggled.selection).toEqual(['c'])
    expect(reduce(untoggled, { type: 'select', mode: 'clear' }).selection).toEqual([])
    expect(() => filesReducer(single, { type: 'select', path: 'x', mode: 'range' })).toThrow('Unknown selection mode')
  })

  it('setSearch opens, updates and closes search, clearing selection', () => {
    const open = reduce(initialFilesState(), { type: 'select', path: 'a' }, { type: 'setSearch', query: '' })

    expect(open).toMatchObject({ search: '', selection: [] })
    expect(reduce(open, { type: 'setSearch', query: 'bio' }).search).toBe('bio')
    expect(reduce(open, { type: 'setSearch', query: null }).search).toBeNull()
  })

  it('prune forgets deleted paths in the selection and the history, so back and forward skip them', () => {
    const exists = (path) => !path.includes('gone')
    const state = { ...initialFilesState('/p', ['/p/x', '/p/gone']), back: ['/a', '/gone'], fwd: ['/gone2', '/b'] }

    const pruned = reduce(state, { type: 'prune', exists, canShow: exists })

    expect(pruned).toMatchObject({ path: '/p', selection: ['/p/x'], back: ['/a'], fwd: ['/b'] })
    expect(reduce(pruned, { type: 'back' })).toMatchObject({ path: '/a', back: [], fwd: ['/b', '/p'] })
    expect(reduce(pruned, { type: 'forward' })).toMatchObject({ path: '/b', back: ['/a', '/p'], fwd: [] })
  })

  it('prune keeps the same state when nothing is gone', () => {
    const state = initialFilesState('/p', ['/p/x'])

    expect(filesReducer(state, { type: 'prune', exists: () => true, canShow: () => true })).toBe(state)
  })

  it('prune keeps a selected file but drops history the window can no longer show', () => {
    const state = { ...initialFilesState('/p', ['/p/d']), back: ['/a', '/p/d'], fwd: ['/p/d'] }

    const pruned = reduce(state, { type: 'prune', exists: () => true, canShow: (path) => path !== '/p/d' })

    expect(pruned).toMatchObject({ selection: ['/p/d'], back: ['/a'], fwd: [] })
  })

  it('prune drops history that leads to the folder already shown, and repeats left by what went', () => {
    const state = { ...initialFilesState('/h'), back: ['/a', '/gone', '/a', '/h'], fwd: ['/b', '/gone', '/b', '/h'] }

    const pruned = reduce(state, { type: 'prune', exists: () => true, canShow: (path) => path !== '/gone' })

    expect(pruned).toMatchObject({ path: '/h', back: ['/a'], fwd: ['/b'] })
  })

  it('throws on unknown actions', () => {
    expect(() => filesReducer(initialFilesState(), { type: 'nope' })).toThrow('Unknown files action: nope')
  })
})
