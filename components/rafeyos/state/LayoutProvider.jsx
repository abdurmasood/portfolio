import { useEffect, useMemo, useRef } from 'react'
import { LayoutContext, useSettings, useWindowsDispatch } from './logic/contexts'
import { computeLayout } from '../shell/chrome/logic/layout'
import { useViewport } from '../shell/chrome/logic/useViewport'

/** Re-fits every window whenever the work area or compact mode changes (not on first render). */
const useRelayout = (layout) => {
  const dispatch = useWindowsDispatch()
  const previous = useRef(layout)
  useEffect(() => {
    if (previous.current.area === layout.area) return
    previous.current = layout
    dispatch({ type: 'relayout', area: layout.area, compact: layout.compact })
  }, [layout, dispatch])
}

export const LayoutProvider = ({ children }) => {
  const viewport = useViewport()
  const { dockPos, iconSize } = useSettings()
  const layout = useMemo(() => computeLayout(viewport, { dockPos, iconSize }), [viewport, dockPos, iconSize])
  useRelayout(layout)
  return <LayoutContext.Provider value={layout}>{children}</LayoutContext.Provider>
}
