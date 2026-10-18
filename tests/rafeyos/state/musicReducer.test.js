import { describe, expect, it } from 'vitest'
import { initialMusic, musicReducer } from '@/components/rafeyos/state/logic/musicReducer'
import { deepFreeze } from '@/components/rafeyos/vfs/content'

const reduce = (state, ...actions) => actions.reduce((current, action) => musicReducer(deepFreeze(current), action), state)

describe('musicReducer', () => {
  it('starts paused at zero, never played', () => {
    expect(initialMusic).toEqual({ playing: false, position: 0, played: false, repeat: false })
  })

  it('marks the track played only once playback really starts', () => {
    const requested = reduce(initialMusic, { type: 'request' })

    expect(requested).toEqual({ playing: true, position: 0, played: false, repeat: false })
    expect(reduce(requested, { type: 'started' })).toEqual({ playing: true, position: 0, played: true, repeat: false })
    expect(reduce(requested, { type: 'blocked' })).toEqual(initialMusic)
  })

  it('pauses in place and stops back to zero', () => {
    const playing = reduce(initialMusic, { type: 'started' }, { type: 'time', position: 61.7 })

    expect(reduce(playing, { type: 'pause' })).toEqual({ playing: false, position: 61, played: true, repeat: false })
    expect(reduce(playing, { type: 'stop' })).toEqual({ playing: false, position: 0, played: true, repeat: false })
  })

  it('toggles repeat, and a stop at the end keeps it on', () => {
    const repeating = reduce(initialMusic, { type: 'toggleRepeat' })

    expect(repeating.repeat).toBe(true)
    expect(reduce(repeating, { type: 'stop' }).repeat).toBe(true)
    expect(reduce(repeating, { type: 'toggleRepeat' }).repeat).toBe(false)
  })

  it('keeps whole seconds and ignores sub-second updates', () => {
    const at = reduce(initialMusic, { type: 'time', position: 12.2 })

    expect(at.position).toBe(12)
    expect(musicReducer(at, { type: 'time', position: 12.9 })).toBe(at)
    expect(reduce(at, { type: 'seek', position: 90 }).position).toBe(90)
    expect(reduce(at, { type: 'seek', position: Number.NaN }).position).toBe(0)
    expect(reduce(at, { type: 'seek', position: -3 }).position).toBe(0)
  })

  it('returns the same state for no-op and unknown actions', () => {
    expect(musicReducer(initialMusic, { type: 'pause' })).toBe(initialMusic)
    expect(musicReducer(initialMusic, { type: 'nope' })).toBe(initialMusic)
  })
})
