// The desktop's state: windows, settings and transient shell UI, each with separate state and
// dispatch contexts, plus layout and the window manager built on top of them.
import { useEffect, useReducer } from 'react'
import {
  SettingsDispatchContext,
  SettingsStateContext,
  ShellDispatchContext,
  ShellStateContext,
  WindowsDispatchContext,
  WindowsStateContext,
  useServices,
} from './contexts'
import { initialSettings, settingsReducer } from './settingsReducer'
import { initialWindows, windowsReducer } from './windowsReducer'
import { initialShell, shellReducer } from './shellReducer'
import { LayoutProvider } from './LayoutProvider'
import { WindowManagerProvider } from '../wm/WindowManagerProvider'

/** Light or dark follows the visitor's system once, on mount. */
const useInitialStyle = (dispatch) => {
  const { prefersDark } = useServices()
  useEffect(() => {
    dispatch({ type: 'set', key: 'style', value: prefersDark() ? 'dark' : 'light' })
  }, [dispatch, prefersDark])
}

export const DesktopProvider = ({ children }) => {
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettings)
  const [windows, windowsDispatch] = useReducer(windowsReducer, initialWindows)
  const [shell, shellDispatch] = useReducer(shellReducer, initialShell)
  useInitialStyle(settingsDispatch)
  return (
    <SettingsDispatchContext.Provider value={settingsDispatch}>
      <SettingsStateContext.Provider value={settings}>
        <WindowsDispatchContext.Provider value={windowsDispatch}>
          <WindowsStateContext.Provider value={windows}>
            <ShellDispatchContext.Provider value={shellDispatch}>
              <ShellStateContext.Provider value={shell}>
                <LayoutProvider>
                  <WindowManagerProvider>{children}</WindowManagerProvider>
                </LayoutProvider>
              </ShellStateContext.Provider>
            </ShellDispatchContext.Provider>
          </WindowsStateContext.Provider>
        </WindowsDispatchContext.Provider>
      </SettingsStateContext.Provider>
    </SettingsDispatchContext.Provider>
  )
}
