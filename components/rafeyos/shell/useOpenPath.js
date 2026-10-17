import { useCallback } from 'react'
import { useMusicControls, useVfs, useWindowManager } from '../state/contexts'
import { handlerFor, isAudio, isWebLink, unavailableNote } from '../apps/availability'
import { realPath } from '../vfs/paths'
import { displayName } from '../vfs/queries'
import { useOpenLinkDialog } from './OpenLinkDialog'
import { useNotify } from './useNotify'

/** The banner shown when a file needs an app that isn't built yet. */
export const unavailableBanner = (vfs, path) => {
  const appId = handlerFor(vfs[realPath(vfs, path)])
  return { appId, title: `Can't open “${displayName(vfs, path)}”`, body: `${unavailableNote(appId)}.` }
}

/**
 * Opens a path in its app; web links ask first; audio starts playing as Music opens;
 * anything without an app yet shows a banner.
 */
export const useOpenPath = () => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const music = useMusicControls()
  const notify = useNotify()
  const openLinkDialog = useOpenLinkDialog()
  return useCallback(
    (path, options) => {
      if (isWebLink(vfs, path)) {
        openLinkDialog()
        return true
      }
      // Still inside the visitor's click, which the browser needs before it lets audio play
      if (isAudio(vfs, path)) music.play()
      if (windowManager.openPath(path, options)) return true
      notify(unavailableBanner(vfs, path))
      return false
    },
    [vfs, windowManager, music, notify, openLinkDialog],
  )
}
