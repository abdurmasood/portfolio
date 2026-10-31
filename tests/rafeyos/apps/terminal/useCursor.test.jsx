// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useCursor } from '@/components/rafeyos/apps/terminal/logic/useCursor'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const inputAt = ({ value, selectionStart, scrollLeft = 0 }) => ({ value, selectionStart, scrollLeft })

describe('useCursor', () => {
  it('starts at the beginning of an empty input', () => {
    const { result } = renderHook(() => useCursor({ current: null }, { input: '' }))

    expect(result.current.caretIndex).toBe(0)
    expect(result.current.left).toBe('calc(0ch - 0px)')
  })

  it('follows the caret and the input scroll on sync', () => {
    const { result } = renderHook(() => useCursor({ current: null }, { input: 'echo hi' }))

    act(() => result.current.sync(inputAt({ value: 'echo hi', selectionStart: 4, scrollLeft: 7 })))

    expect(result.current.caretIndex).toBe(4)
    expect(result.current.left).toBe('calc(4ch - 7px)')
  })

  it('puts the cursor at the end when the input changes in code, as history and Tab do', () => {
    const inputRef = { current: inputAt({ value: '', selectionStart: 0 }) }
    const { result, rerender } = renderHook(({ input }) => useCursor(inputRef, { input }), { initialProps: { input: '' } })

    inputRef.current = inputAt({ value: 'whoami', selectionStart: 6 })
    rerender({ input: 'whoami' })

    expect(result.current.caretIndex).toBe(6)
  })

  it('holds solid while keys are pressed, then blinks again once typing stops', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCursor({ current: null }, { input: '' }))

    act(() => result.current.markTyping())
    expect(result.current.isTyping).toBe(true)

    act(() => vi.advanceTimersByTime(500))
    expect(result.current.isTyping).toBe(false)
  })
})
