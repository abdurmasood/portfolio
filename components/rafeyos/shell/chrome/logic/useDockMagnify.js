import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLatest } from '@/components/rafeyos/state/logic/useLatest'
import { isSettled, stepSpring, targetSizes } from './dockMagnify'

const writeSize = (element, size) => {
  const px = `${size.toFixed(2)}px`
  element.style.width = px
  element.style.height = px
}

/**
 * macOS dock magnification. Each frame writes sizes straight onto the buttons, with no React
 * render; only `hot`, the hovered key, is state (it drives the label). The loop stops once every
 * icon settles, so a still pointer moves nothing.
 * @param {{ groups: string[][], rest: number, reduced: () => boolean }} options - rest is the
 *   resting button size in px; groups swell independently of each other
 * @returns {{ hot: string | null, controls: { bindElement: (key: string, element: HTMLElement | null) => void,
 *   hover: (key: string | null) => void, point: (key: string) => void, leave: () => void, blur: () => void,
 *   hold: (key: string | null) => void } }} - hover is focus's swell, point the pointer's; blur falls back to the
 *   icon under the pointer; hold pins one icon swollen until hold(null). controls keeps one identity, so
 *   memoised buttons don't re-render on every hover
 */
export const useDockMagnify = ({ groups, rest, reduced }) => {
  const [hot, setHot] = useState(null)
  const hotRef = useRef(null)
  const elements = useRef(new Map())
  const springs = useRef(new Map())
  const frame = useRef(0)
  const latest = useLatest({ groups, rest, reduced })

  const tickAll = useCallback(
    (seconds) => {
      const { groups: currentGroups, rest: currentRest, reduced: isReduced } = latest.current
      let moving = false
      targetSizes(currentGroups, hotRef.current, currentRest).forEach((target, key) => {
        const current = springs.current.get(key) ?? { size: currentRest, velocity: 0 }
        let next = isReduced() ? { size: target, velocity: 0 } : stepSpring(current, target, seconds)
        if (isSettled(next, target)) next = { size: target, velocity: 0 }
        else moving = true
        springs.current.set(key, next)
        const element = elements.current.get(key)
        if (element) writeSize(element, next.size)
      })
      return moving
    },
    [latest],
  )

  const run = useCallback(() => {
    if (frame.current) return
    let last = performance.now()
    const tick = (now) => {
      const seconds = Math.max(0, (now - last) / 1000)
      last = now
      frame.current = tickAll(seconds) ? requestAnimationFrame(tick) : 0
    }
    frame.current = requestAnimationFrame(tick)
  }, [tickAll])

  const show = useCallback(
    (key) => {
      if (hotRef.current === key) return
      hotRef.current = key
      setHot(key)
      run()
    },
    [run],
  )

  // A held icon (its menu is open) stays swollen whatever the pointer does; hovering still records
  // where the pointer is, so letting go settles on that
  const hoverKey = useRef(null)
  const held = useRef(null)
  const hover = useCallback(
    (key) => {
      hoverKey.current = key
      show(held.current ?? key)
    },
    [show],
  )
  const hold = useCallback(
    (key) => {
      held.current = key
      show(key ?? hoverKey.current)
    },
    [show],
  )
  // The icon under the pointer, apart from focus: a right-click menu takes focus from the icon
  // while the pointer stays on it, and that blur must not shrink it
  const pointerKey = useRef(null)
  const point = useCallback(
    (key) => {
      pointerKey.current = key
      hover(key)
    },
    [hover],
  )
  const leave = useCallback(() => point(null), [point])
  const blur = useCallback(() => hover(pointerKey.current), [hover])

  const bindElement = useCallback((key, element) => {
    if (!element) {
      elements.current.delete(key)
      return
    }
    elements.current.set(key, element)
    const spring = springs.current.get(key)
    if (spring) writeSize(element, spring.size)
  }, [])

  // A new icon size (the Settings slider) snaps every icon instead of springing across
  useEffect(() => {
    targetSizes(latest.current.groups, hotRef.current, rest).forEach((size, key) => {
      springs.current.set(key, { size, velocity: 0 })
      const element = elements.current.get(key)
      if (element) writeSize(element, size)
    })
  }, [rest, latest])

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      frame.current = 0
    },
    [],
  )

  const controls = useMemo(
    () => ({ bindElement, hover, point, leave, blur, hold }),
    [bindElement, hover, point, leave, blur, hold],
  )
  return { hot, controls }
}
