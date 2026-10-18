import { useCallback } from 'react'
import { useSettings, useShellDispatch } from '../../../state/logic/contexts'
import { useLatest } from '../../../state/logic/useLatest'

/**
 * Shows a notification banner unless Do Not Disturb is on. Stable across DND changes,
 * so long-lived callers (the music player) can hold on to it.
 * @returns {(banner: { appId?: string, title: string, body: string }) => void}
 */
export const useNotify = () => {
  const shellDispatch = useShellDispatch()
  const dndRef = useLatest(useSettings().dnd)
  return useCallback(
    (banner) => {
      if (!dndRef.current) shellDispatch({ type: 'showBanner', banner })
    },
    [shellDispatch, dndRef],
  )
}
