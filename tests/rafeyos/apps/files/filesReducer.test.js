import { describe, it, expect } from 'vitest'
import { filesReducer, initialFilesState } from '@/components/rafeyos/apps/files/logic/filesReducer'
import { deepFreeze } from '@/components/rafeyos/core/vfs/content'

const reduce = (state, ...actions) => actions.reduce((s, a) => filesReducer(deepFreeze(s), a), state)

describe('filesReducer', () => {
  it('starts at home in grid view, or at a given path and selection', () => {
    expect(initialFilesState()).toEqual({ path: '~', back: [], fwd: [], view: 'grid', selection: [], search: null })
    expect(initialFilesState('~/Music', ['~/Music/story.txt'])).toMatchObject({ path: '~/Music', selection: ['~/Music/story.txt'] })
  })

  it('go pushes history, clears forward, search and selection', () => {
    const state = reduce(initialFilesState(), { type: 'select', path: '~/bio.txt' }, { type: 'go', path: '~/Music' })

    expect(state).toMatchObject({ path: '~/Music', back: ['~'], fwd: [], selection: [], search: null })
  })

  it('go to the current folder is a no-op unless searching', () => {
    const start = initialFilesState()
    const searching = reduce(start, { type: 'setSearch', query: 'bio' })

    expect(filesReducer(start, { type: 'go', path: '~' })).toBe(start)
    expect(reduce(searching, { type: 'go', path: '~' })).toMatchObject({ search: null, back: ['~'] })
  })

  it('go fromHistory does not touch history', () => {
    const state = reduce(initialFilesState(), { type: 'go', path: '~/blog', fromHistory: true })

    expect(state).toMatchObject({ path: '~/blog', back: [], fwd: [] })
  })

  it('back and forward walk the history', () => {
    const there = reduce(initialFilesState(), { type: 'go', path: '~/Music' }, { type: 'go', path: '~/blog' })

    const back = reduce(there, { type: 'back' })
    const forward = reduce(back, { type: 'forward' })

    expect(back).toMatchObject({ path: '~/Music', back: ['~'], fwd: ['~/blog'] })
    expect(forward).toMatchObject({ path: '~/blog', back: ['~', '~/Music'], fwd: [] })
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

  it('ignores unknown actions', () => {
    const start = initialFilesState()

    expect(filesReducer(start, { type: 'nope' })).toBe(start)
  })
})
