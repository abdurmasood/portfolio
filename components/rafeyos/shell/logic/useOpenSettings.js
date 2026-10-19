import { useCallback } from 'react'
import { useShellDispatch, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { SETTINGS_PAGES } from '@/components/rafeyos/core/catalog/settingsPages'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { APP } from '@/components/rafeyos/core/catalog/apps'

/** Opens Settings (one window) on a page; if it's already open, it comes forward and turns to the page. */
export const useOpenSettings = () => {
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  return useCallback(
    (page = SETTINGS_PAGES.APPEARANCE) => {
      shellDispatch({ type: SHELL_ACTIONS.CLOSE_TRANSIENTS })
      windowManager.openApp(APP.SETTINGS, { init: { page } })
    },
    [windowManager, shellDispatch],
  )
}
