// The appearance is saved per visitor (services.settings). Wi-Fi, Bluetooth, volume, Do Not Disturb and Night Light
// outlive a restart (SettingsProvider sits above the desktop) but not the page: in memory only.
import { useCallback, useMemo, useReducer, useSyncExternalStore } from 'react'
import { SettingsDispatchContext, SettingsStateContext, useServices } from './logic/contexts'
import { initialSettings, settingsReducer } from './logic/settingsReducer'
import { WifiLinkProvider } from './WifiLink'
import { DEFAULT_SETTINGS, SAVED_KEYS } from '@/components/rafeyos/core/settings/settingsSchema'
import { effectiveSettings } from '@/components/rafeyos/core/settings/settingsView'

/** Light or dark as the visitor's system prefers it now, re-rendering when that changes. */
const useOsPrefersDark = () => {
  const { prefersDark, watchColorScheme } = useServices()
  return useSyncExternalStore(watchColorScheme, prefersDark, prefersDark)
}

/**
 * The reducer's dispatch, with saved keys sent to the store instead. The next value comes from the store and the OS
 * as they are now, not the last render, so two toggles in one event both count.
 */
const useSettingsDispatcher = (dispatchMemory) => {
  const { settings: store, prefersDark } = useServices()
  return useCallback(
    (action) => {
      if (!SAVED_KEYS.includes(action.key)) return dispatchMemory(action)
      const current = { ...DEFAULT_SETTINGS, ...effectiveSettings(store.getState(), prefersDark()) }
      store.set(action.key, settingsReducer(current, action)[action.key])
    },
    [dispatchMemory, store, prefersDark],
  )
}

export const SettingsProvider = ({ children }) => {
  const { settings: store } = useServices()
  const [memory, dispatchMemory] = useReducer(settingsReducer, initialSettings)
  const saved = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  const prefersDark = useOsPrefersDark()
  // Computed during render, so the first frame already has the OS's style: no dark-to-light flash at mount
  const settings = useMemo(() => ({ ...memory, ...effectiveSettings(saved, prefersDark) }), [memory, saved, prefersDark])
  const dispatch = useSettingsDispatcher(dispatchMemory)
  return (
    <SettingsDispatchContext.Provider value={dispatch}>
      <SettingsStateContext.Provider value={settings}>
        <WifiLinkProvider wifi={settings.wifi}>{children}</WifiLinkProvider>
      </SettingsStateContext.Provider>
    </SettingsDispatchContext.Provider>
  )
}
