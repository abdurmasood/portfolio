import { describe, expect, it, vi } from 'vitest'
import { createReducer } from '@/components/rafeyos/state/logic/createReducer'

describe('createReducer', () => {
  it('routes each action to the handler for its type', () => {
    const reducer = createReducer('test', { up: (state) => state + 1, down: (state) => state - 1 })

    expect(reducer(1, { type: 'up' })).toBe(2)
    expect(reducer(1, { type: 'down' })).toBe(0)
  })

  it('passes the state and the whole action to the handler', () => {
    const handler = vi.fn(() => 'next')
    const action = { type: 'go', amount: 3 }

    expect(createReducer('test', { go: handler })('prev', action)).toBe('next')
    expect(handler).toHaveBeenCalledWith('prev', action)
  })

  it('throws with the reducer name and the unknown type', () => {
    expect(() => createReducer('test', {})({}, { type: 'nope' })).toThrow('Unknown test action: nope')
  })
})
