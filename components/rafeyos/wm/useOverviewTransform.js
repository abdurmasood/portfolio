import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLatest } from '../state/useLatest'
import { windowOverviewTransform } from '../shell/overviewModel'

// Matches the mockup's overview spread (transform .3s)
export const OVERVIEW_TRANSITION_MS = 300
const OVERVIEW_TRANSITION = `transform ${OVERVIEW_TRANSITION_MS}ms cubic-bezier(.25,.8,.3,1)`

/** Back from the overview: drop the transition, and hide the window again if it's still minimized. */
const settle = (element, minimizedRef) => {
  element.style.transition = ''
  if (minimizedRef.current) element.hidden = true
}

/**
 * Moves a window to its place in the Activities overview with a CSS transition, and back when
 * the overview closes. Minimized windows show while spread out and hide again once back.
 * @param {{ current: HTMLElement }} elementRef
 * @param {{ target: object|null, rect: object, minimized: boolean, reduced: boolean }} state
 */
export const useOverviewTransform = (elementRef, { target, rect, minimized, reduced }) => {
  const minimizedRef = useLatest(minimized)
  const settleTimer = useRef(0)
  useEffect(() => () => clearTimeout(settleTimer.current), [])
  useLayoutEffect(() => {
    const element = elementRef.current
    if (!target) return undefined
    clearTimeout(settleTimer.current)
    element.hidden = false
    element.style.transformOrigin = '0 0'
    element.style.transition = reduced ? '' : OVERVIEW_TRANSITION
    element.style.transform = windowOverviewTransform(rect, target)
    return () => {
      element.style.transform = ''
      // Deferred even without motion: a window picked from the overview is restored in the same
      // commit, and the minimized ref only catches up after this cleanup runs
      settleTimer.current = setTimeout(settle, reduced ? 0 : OVERVIEW_TRANSITION_MS, element, minimizedRef)
    }
  }, [elementRef, target, rect, reduced, minimizedRef])
}
