import { useCallback } from 'react'
import { useShellDispatch, useWindowManager } from '../../../state/logic/contexts'
import { SETTINGS_PAGES } from '../../../apps/settings/logic/settingsPages'

/** Opens Settings (one window) on a page; if it's already open, it comes forward and turns to the page. */
export const useOpenSettings = () => {
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  return useCallback(
    (page = SETTINGS_PAGES.APPEARANCE) => {
      shellDispatch({ type: 'closeTransients' })
      windowManager.openApp('settings', { init: { page } })
    },
    [windowManager, shellDispatch],
  )
}
