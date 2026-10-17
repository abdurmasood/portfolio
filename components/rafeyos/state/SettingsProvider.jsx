// Settings outlive a restart (the boot splash shows the chosen accent) but not the page: in memory only.
import { useEffect, useReducer } from 'react'
import { SettingsDispatchContext, SettingsStateContext, useServices } from './contexts'
import { initialSettings, settingsReducer } from './settingsReducer'

/** Light or dark follows the visitor's system once, when rafeyOS starts. */
const useInitialStyle = (dispatch) => {
  const { prefersDark } = useServices()
  useEffect(() => {
    dispatch({ type: 'set', key: 'style', value: prefersDark() ? 'dark' : 'light' })
  }, [dispatch, prefersDark])
}

export const SettingsProvider = ({ children }) => {
  const [settings, dispatch] = useReducer(settingsReducer, initialSettings)
  useInitialStyle(dispatch)
  return (
    <SettingsDispatchContext.Provider value={dispatch}>
      <SettingsStateContext.Provider value={settings}>{children}</SettingsStateContext.Provider>
    </SettingsDispatchContext.Provider>
  )
}
