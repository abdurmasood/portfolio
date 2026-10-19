import { describe, it, expect } from 'vitest'
import { settingsReducer, initialSettings, DEFAULT_SETTINGS } from '@/components/rafeyos/state/logic/settingsReducer'

describe('settingsReducer', () => {
  it('starts from the mockup defaults', () => {
    expect(initialSettings).toEqual({
      style: 'dark', accent: '#E95420', wall: 0, dockPos: 'left', iconSize: 40, showHome: true, corner: 'tl',
      dnd: false, night: false, wifi: true, bt: false, volume: 70,
    })
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true)
  })

  it('set returns a new object with the value, leaving the input untouched', () => {
    const state = settingsReducer(initialSettings, { type: 'set', key: 'volume', value: 30 })

    expect(state.volume).toBe(30)
    expect(state).not.toBe(initialSettings)
    expect(initialSettings.volume).toBe(70)
  })

  it('set to the current value returns the same state', () => {
    expect(settingsReducer(initialSettings, { type: 'set', key: 'wall', value: 0 })).toBe(initialSettings)
  })

  it('set throws on unknown keys and mismatched types', () => {
    expect(() => settingsReducer(initialSettings, { type: 'set', key: 'theme', value: 'x' })).toThrow('Unknown setting: theme')
    expect(() => settingsReducer(initialSettings, { type: 'set', key: 'volume', value: '30' })).toThrow(TypeError)
  })

  it('set rejects values outside each setting\'s choices or range', () => {
    const invalid = [
      ['style', 'sepia'], ['dockPos', 'top'], ['corner', 'mid'], ['iconSize', 60], ['iconSize', 27.5],
      ['volume', 101], ['volume', -1], ['wall', 4], ['accent', 'orange'],
    ]
    invalid.forEach(([key, value]) => {
      expect(() => settingsReducer(initialSettings, { type: 'set', key, value })).toThrow(RangeError)
    })
  })

  it('set accepts every listed choice and range end', () => {
    const valid = [['dockPos', 'right'], ['corner', 'br'], ['iconSize', 56], ['volume', 0], ['wall', 3], ['accent', '#0073e5']]
    valid.forEach(([key, value]) => {
      expect(settingsReducer(initialSettings, { type: 'set', key, value })[key]).toBe(value)
    })
  })

  it('toggle flips booleans and swaps style', () => {
    const toggled = ['dnd', 'night', 'wifi', 'style'].reduce((s, key) => settingsReducer(s, { type: 'toggle', key }), initialSettings)

    expect(toggled).toMatchObject({ dnd: true, night: true, wifi: false, style: 'light' })
    expect(settingsReducer(toggled, { type: 'toggle', key: 'style' }).style).toBe('dark')
  })

  it('toggle of a corrupted style falls back to dark', () => {
    expect(settingsReducer({ ...initialSettings, style: 'weird' }, { type: 'toggle', key: 'style' }).style).toBe('dark')
  })

  it('toggle throws on unknown and non-boolean keys', () => {
    expect(() => settingsReducer(initialSettings, { type: 'toggle', key: 'nope' })).toThrow('Unknown setting')
    expect(() => settingsReducer(initialSettings, { type: 'toggle', key: 'volume' })).toThrow(TypeError)
  })

  it('throws on unknown actions', () => {
    expect(() => settingsReducer(initialSettings, { type: 'nope' })).toThrow('Unknown settings action: nope')
  })
})
