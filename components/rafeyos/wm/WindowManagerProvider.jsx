import { useMemo } from 'react'
import { WindowManagerContext, DockRegistryContext, useLayout, useVfs, useWindowsDispatch, useWindowsState } from '../state/logic/contexts'
import { createWindowManager } from './logic/windowManager'
import { useLatest } from '../state/logic/useLatest'

export const WindowManagerProvider = ({ children }) => {
  const dispatch = useWindowsDispatch()
  const stateRef = useLatest(useWindowsState())
  const layoutRef = useLatest(useLayout())
  const vfsRef = useLatest(useVfs().vfs)
  const windowManager = useMemo(
    () => createWindowManager({
      dispatch,
      getState: () => stateRef.current,
      getLayout: () => layoutRef.current,
      getVfs: () => vfsRef.current,
    }),
    [dispatch, stateRef, layoutRef, vfsRef],
  )
  // app id -> dock button element; the dock writes it through ref callbacks
  const dockRegistry = useMemo(() => new Map(), [])
  return (
    <WindowManagerContext.Provider value={windowManager}>
      <DockRegistryContext.Provider value={dockRegistry}>{children}</DockRegistryContext.Provider>
    </WindowManagerContext.Provider>
  )
}
