import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useServices, useWindowManager } from '../state/contexts'
import { WINDOW_PHASES } from '../state/windowsReducer'
import { SNAP_MODES } from './geometry'
import { WindowChromeContext } from './WindowChromeContext'
import { useWindowDrag } from './useWindowDrag'
import { useWindowResize } from './useWindowResize'
import { useWindowLifecycle } from './useWindowLifecycle'
import { ResizeHandles } from './ResizeHandles'
import { AppBody } from './AppBody'
import { applyRect } from './applyRect'

// How long the .anim transition runs when the max button or a double-click snaps the window
const SNAP_TRANSITION_MS = 230

/** The rect is written imperatively (gestures write the same style), on every committed change. */
const useRectStyle = (elementRef, rect) => {
  useLayoutEffect(() => applyRect(elementRef.current, rect), [elementRef, rect])
}

const useSnapTransition = () => {
  const [animating, setAnimating] = useState(false)
  useEffect(() => {
    if (!animating) return undefined
    const timer = setTimeout(() => setAnimating(false), SNAP_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [animating])
  return [animating, setAnimating]
}

const useChrome = ({ elementRef, winRef, isMax, setAnimating }) => {
  const windowManager = useWindowManager()
  const { reducedMotion } = useServices()
  const startDrag = useWindowDrag({ elementRef, winRef })
  return useMemo(() => {
    const id = () => winRef.current.id
    const toggleMax = () => {
      if (!reducedMotion()) setAnimating(true)
      windowManager.toggleMax(id())
    }
    return {
      startDrag,
      toggleMax,
      isMax,
      minimize: () => windowManager.minimize(id()),
      close: () => windowManager.close(id()),
    }
  }, [winRef, windowManager, reducedMotion, startDrag, isMax, setAnimating])
}

const classNameFor = ({ isMax, focused, animating }) =>
  ['win', isMax && 'max', !focused && 'backdrop', animating && 'anim'].filter(Boolean).join(' ')

export const Window = memo(function Window({ win, zIndex, focused }) {
  const elementRef = useRef(null)
  const winRef = useRef(win)
  useLayoutEffect(() => {
    winRef.current = win
  }, [win])
  const windowManager = useWindowManager()
  const [animating, setAnimating] = useSnapTransition()
  const isMax = win.mode !== SNAP_MODES.NORMAL
  const chrome = useChrome({ elementRef, winRef, isMax, setAnimating })
  const startResize = useWindowResize({ elementRef, winRef })
  useRectStyle(elementRef, win.rect)
  useWindowLifecycle(elementRef, win)
  const closing = win.phase === WINDOW_PHASES.CLOSING
  return (
    <div
      ref={elementRef}
      className={classNameFor({ isMax, focused, animating })}
      style={{ zIndex, pointerEvents: closing ? 'none' : undefined }}
      role="group"
      aria-label={win.title}
      data-app={win.appId}
      data-window-id={win.id}
      data-minimized={win.minimized || undefined}
      onPointerDown={() => focused || windowManager.focus(win.id)}
    >
      <WindowChromeContext.Provider value={chrome}>
        <div className="wcontent">
          <AppBody appId={win.appId} windowId={win.id} arg={win.arg} init={win.init} />
        </div>
      </WindowChromeContext.Provider>
      <ResizeHandles onStart={startResize} />
    </div>
  )
})
