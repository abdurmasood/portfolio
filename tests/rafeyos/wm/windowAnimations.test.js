import { describe, expect, it, vi } from 'vitest'
import {
  animateClose,
  animateMinimize,
  animateOpen,
  animateRestore,
  fallbackTarget,
  minimizeTransform,
} from '@/components/rafeyos/wm/logic/windowAnimations'

const fakeElement = () => {
  const animation = { onfinish: null, cancel: vi.fn() }
  return { style: {}, animate: vi.fn(() => animation), animation }
}

const rect = { x: 100, y: 100, w: 400, h: 300 }

describe('window animations', () => {
  it('computes the dock-button transform', () => {
    expect(minimizeTransform(rect, { x: 0, y: 400, w: 48, h: 48 })).toBe('translate(-92px, 312px) scale(0.08)')
    expect(fallbackTarget(800)).toEqual({ x: 0, y: 400, w: 48, h: 48 })
  })

  it('does nothing with reduced motion, finishing at once', () => {
    const element = fakeElement()
    const onDone = vi.fn()

    expect(animateOpen(element, { rect, from: null, reduced: true })).toBeNull()
    expect(animateRestore(element, { transform: 'x', reduced: true })).toBeNull()
    animateMinimize(element, { transform: 'x', reduced: true }, onDone)
    animateClose(element, { reduced: true }, onDone)

    expect(element.animate).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('treats elements without WAAPI like reduced motion', () => {
    const onDone = vi.fn()

    animateClose({ style: {} }, { reduced: false }, onDone)

    expect(onDone).toHaveBeenCalled()
  })

  it('grows from the launcher rect', () => {
    const element = fakeElement()

    animateOpen(element, { rect, from: { x: 0, y: 0, w: 40, h: 40 }, reduced: false })

    expect(element.style.transformOrigin).toBe('-80px -80px')
    expect(element.animate.mock.calls[0][1].duration).toBe(240)
  })

  it('pops in place without a launcher', () => {
    const element = fakeElement()

    animateOpen(element, { rect, from: null, reduced: false })

    expect(element.style.transformOrigin).toBe('50% 50%')
    expect(element.animate.mock.calls[0][0][0].transform).toBe('scale(.92)')
  })

  it('calls back when minimize and close finish', () => {
    const element = fakeElement()
    const onDone = vi.fn()

    animateMinimize(element, { transform: 't', reduced: false }, onDone)
    element.animation.onfinish()
    animateClose(element, { reduced: false }, onDone)
    element.animation.onfinish()

    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('restores from the stored transform, or not at all without one', () => {
    const element = fakeElement()

    expect(animateRestore(element, { transform: null, reduced: false })).toBeNull()
    animateRestore(element, { transform: 't', reduced: false })

    expect(element.animate.mock.calls[0][0][0]).toEqual({ transform: 't', opacity: 0 })
  })
})
