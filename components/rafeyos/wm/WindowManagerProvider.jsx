import { useLayoutEffect, useMemo, useRef } from 'react'
import { WindowManagerContext, DockRegistryContext, useLayout, useVfs, useWindowsDispatch, useWindowsState } from '../state/contexts'
import { createWindowManager } from './windowManager'

/** Keeps a ref pointed at the latest committed value, for callbacks that must stay stable. */
const useLatest = (value) => {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

export const WindowManagerProvider = ({ children }) => {
  const dispatch = useWindowsDispatch()
  const stateRef = useLatest(useWindowsState())
  const layoutRef = useLatest(useLayout())
  const { vfs } = useVfs()
  const windowManager = useMemo(
    () => createWindowManager({ dispatch, getState: () => stateRef.current, getLayout: () => layoutRef.current, vfs }),
    [dispatch, stateRef, layoutRef, vfs],
  )
  // app id -> dock button element; the dock writes it through ref callbacks
  const dockRegistry = useMemo(() => new Map(), [])
  return (
    <WindowManagerContext.Provider value={windowManager}>
      <DockRegistryContext.Provider value={dockRegistry}>{children}</DockRegistryContext.Provider>
    </WindowManagerContext.Provider>
  )
}
