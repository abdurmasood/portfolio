import { useCallback, useEffect, useRef } from 'react'
import { usePointerTrack } from '@/components/rafeyos/wm/logic/usePointerTrack'
import { useLatest } from '@/components/rafeyos/state/logic/useLatest'
import { INITIAL_ANGLES, SPIN_PER_FRAME, dragAngles, drawWireframe } from './wireframe'

// Sharper than 2x costs fill rate for no visible gain on hairlines
const MAX_DPR = 2

/** Matches the bitmap to the element's CSS size in device pixels; returns the ratio used. */
const fitCanvas = (canvas) => {
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
  const width = Math.round(canvas.clientWidth * dpr)
  const height = Math.round(canvas.clientHeight * dpr)
  if (width && height && (canvas.width !== width || canvas.height !== height)) {
    canvas.width = width
    canvas.height = height
  }
  return dpr
}

const paint = (canvas, segments, angles) => {
  const context = canvas?.getContext('2d')
  if (!context) return
  const dpr = fitCanvas(canvas)
  drawWireframe(context, { segments, angles, width: canvas.width, height: canvas.height, dpr })
}

/** Without the animation loop, a resized window still gets a crisp frame. */
const useRedrawOnResize = (canvasRef, draw, animate) => {
  useEffect(() => {
    const canvas = canvasRef.current
    if (animate || !canvas || typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(() => draw())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [canvasRef, draw, animate])
}

/** Auto-rotates once per frame while `animate`; otherwise draws one still frame (and on each change). */
const useSpin = ({ draw, animate, segments, angles, dragging }) => {
  useEffect(() => {
    if (!animate) {
      draw()
      return undefined
    }
    let frame = 0
    const tick = () => {
      if (!dragging.current) angles.current = { ...angles.current, ay: angles.current.ay + SPIN_PER_FRAME }
      draw()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [draw, animate, segments, angles, dragging])
}

/**
 * The Projects wireframe: a requestAnimationFrame loop with DPR-aware sizing and drag to rotate.
 * @param {{ canvasRef: object, segments: Array, animate: boolean }} options - animate is false while
 *   the window is minimized or motion is reduced; unmounting stops the loop too
 * @returns {(event: import('react').PointerEvent<HTMLCanvasElement>) => void} the canvas's pointerdown handler
 */
export const useWireframeCanvas = ({ canvasRef, segments, animate }) => {
  const angles = useRef(INITIAL_ANGLES)
  const dragging = useRef(false)
  const segmentsRef = useLatest(segments)
  const animateRef = useLatest(animate)
  const draw = useCallback(() => paint(canvasRef.current, segmentsRef.current, angles.current), [canvasRef, segmentsRef])
  useSpin({ draw, animate, segments, angles, dragging })
  useRedrawOnResize(canvasRef, draw, animate)
  const track = usePointerTrack()
  return useCallback(
    (event) => {
      if (event.button !== 0) return
      const start = angles.current
      const origin = { x: event.clientX, y: event.clientY }
      dragging.current = true
      track(event, {
        move: (point) => {
          angles.current = dragAngles(start, { dx: point.x - origin.x, dy: point.y - origin.y })
          if (!animateRef.current) draw()
        },
        end: () => {
          dragging.current = false
        },
      })
    },
    [track, draw, animateRef],
  )
}
