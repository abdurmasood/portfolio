import { useCallback } from 'react'
import { useShellDispatch, useVfs, useWindowManager } from '../state/contexts'
import { handlerFor, unavailableNote } from '../apps/availability'
import { realPath } from '../vfs/paths'
import { displayName } from '../vfs/queries'

/** The banner shown when a file needs an app that isn't built yet. */
export const unavailableBanner = (vfs, path) => {
  const appId = handlerFor(vfs[realPath(vfs, path)])
  return { appId, title: `Can't open “${displayName(vfs, path)}”`, body: `${unavailableNote(appId)}.` }
}

/** Opens folders in Files; anything else shows a "not available yet" banner. */
export const useOpenPath = () => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  return useCallback(
    (path, options) => {
      if (windowManager.openPath(path, options)) return true
      shellDispatch({ type: 'showBanner', banner: unavailableBanner(vfs, path) })
      return false
    },
    [vfs, windowManager, shellDispatch],
  )
}
