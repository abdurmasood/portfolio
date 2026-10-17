import { useCallback, useEffect, useRef } from 'react'

const pointOf = (event) => ({ x: event.clientX, y: event.clientY })

const capture = (element, pointerId, on) => {
  try {
    if (on) element.setPointerCapture?.(pointerId)
    else element.releasePointerCapture?.(pointerId)
  } catch {
    // The pointer is already gone (e.g. released by the browser); tracking still ends normally
  }
}

/**
 * Follows one pointer from a pointerdown: captures it on the pressed element and calls
 * move(point) at most once per animation frame, then end() on release. Only one gesture
 * runs at a time, and an unmount mid-gesture removes the listeners.
 * @returns {(event: PointerEvent, handlers: { move: Function, end: Function }) => void}
 */
export const usePointerTrack = () => {
  const stopRef = useRef(null)
  useEffect(() => () => stopRef.current?.(), [])
  return useCallback((event, { move, end }) => {
    stopRef.current?.()
    const element = event.currentTarget
    const { pointerId } = event
    let frame = 0
    let latest = null
    const flush = () => {
      frame = 0
      if (latest) move(latest)
    }
    const onMove = (moveEvent) => {
      latest = pointOf(moveEvent)
      if (!frame) frame = requestAnimationFrame(flush)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerup', onUp)
      element.removeEventListener('pointercancel', onUp)
      capture(element, pointerId, false)
      stopRef.current = null
    }
    function onUp() {
      const pending = frame !== 0
      // stop() cancels the queued frame; apply its point now so the release lands exactly
      stop()
      if (pending && latest) move(latest)
      end()
    }
    capture(element, pointerId, true)
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerup', onUp)
    element.addEventListener('pointercancel', onUp)
    stopRef.current = stop
  }, [])
}
