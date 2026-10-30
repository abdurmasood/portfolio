import { useEffect } from 'react'
import { useServices, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { takeHandoff } from './logic/sessionStore'

/**
 * Opens the window a homepage command asked for (`nautilus ~`, `xdg-open bio.txt`) once the desktop is up.
 * In an effect, since strict mode runs render twice; taking the hand-off clears it, so the second effect run opens nothing.
 */
export const HandoffOpener = () => {
  const { storage } = useServices()
  const windowManager = useWindowManager()
  useEffect(() => {
    const open = takeHandoff(storage)
    if (!open) return
    if (open.app) windowManager.openApp(open.app, { path: open.path })
    else windowManager.openPath(open.path)
  }, [storage, windowManager])
  return null
}
