import { useEffect, useLayoutEffect, useRef } from 'react'
import { useDockRegistry, useServices, useWindowManager } from '../state/contexts'
import { WINDOW_PHASES } from '../state/windowsReducer'
import {
  animateClose,
  animateMinimize,
  animateOpen,
  animateRestore,
  fallbackTarget,
  minimizeTransform,
  rectOfElement,
} from './windowAnimations'

const useOpenAnimation = (elementRef, win, reduced) => {
  const windowManager = useWindowManager()
  const { id } = win
  const rectRef = useRef(win.rect)
  useLayoutEffect(() => {
    const animation = animateOpen(elementRef.current, { rect: rectRef.current, from: windowManager.openOrigin(id), reduced })
    // StrictMode replays mount effects: cancel so the replay starts clean
    return () => animation?.cancel()
  }, [elementRef, windowManager, id, reduced])
}

/** Minimize shrinks into the app's dock button then hides; restore plays it backwards. */
const useMinimizeAnimation = (elementRef, win, reduced) => {
  const registry = useDockRegistry()
  const transformRef = useRef(null)
  const { minimized, appId } = win
  useLayoutEffect(() => {
    const element = elementRef.current
    if (minimized) {
      const button = registry.get(appId)
      const target = button ? rectOfElement(button) : fallbackTarget(window.innerHeight)
      transformRef.current = minimizeTransform(rectOfElement(element), target)
      const animation = animateMinimize(element, { transform: transformRef.current, reduced }, () => {
        element.hidden = true
      })
      return () => animation?.cancel?.()
    }
    if (!element.hidden) return undefined
    element.hidden = false
    const animation = animateRestore(element, { transform: transformRef.current, reduced })
    return () => animation?.cancel()
  }, [elementRef, registry, minimized, appId, reduced])
}

/** Two-phase close: the reducer marks the window closing, this fades it out, then removes it. */
const useCloseAnimation = (elementRef, win, reduced) => {
  const windowManager = useWindowManager()
  const { id, phase } = win
  useEffect(() => {
    if (phase !== WINDOW_PHASES.CLOSING) return undefined
    const animation = animateClose(elementRef.current, { reduced }, () => windowManager.remove(id))
    return () => animation?.cancel?.()
  }, [elementRef, windowManager, id, phase, reduced])
}

export const useWindowLifecycle = (elementRef, win) => {
  const { reducedMotion } = useServices()
  const reduced = reducedMotion()
  useOpenAnimation(elementRef, win, reduced)
  useMinimizeAnimation(elementRef, win, reduced)
  useCloseAnimation(elementRef, win, reduced)
}
