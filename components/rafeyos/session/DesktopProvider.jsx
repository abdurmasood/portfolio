// One desktop session's state: windows and transient shell UI, each with separate state and
// dispatch contexts, plus layout, the window manager and the music player built on top of them.
// Settings live above (SettingsProvider), so they survive a restart.
import { useReducer } from 'react'
import { AppComponentsContext, ShellDispatchContext, ShellStateContext, WindowsDispatchContext, WindowsStateContext } from '@/components/rafeyos/state/logic/contexts'
import { initialWindows, windowsReducer } from '@/components/rafeyos/state/logic/windowsReducer'
import { initialShell, shellReducer } from '@/components/rafeyos/state/logic/shellReducer'
import { LayoutProvider } from '@/components/rafeyos/state/LayoutProvider'
import { WindowManagerProvider } from '@/components/rafeyos/wm/WindowManagerProvider'
import { MusicProvider } from '@/components/rafeyos/state/MusicProvider'
import { APP_COMPONENTS } from '@/components/rafeyos/apps/appComponents'

export const DesktopProvider = ({ children }) => {
  const [windows, windowsDispatch] = useReducer(windowsReducer, initialWindows)
  const [shell, shellDispatch] = useReducer(shellReducer, initialShell)
  return (
    <WindowsDispatchContext.Provider value={windowsDispatch}>
      <WindowsStateContext.Provider value={windows}>
        <ShellDispatchContext.Provider value={shellDispatch}>
          <ShellStateContext.Provider value={shell}>
            <LayoutProvider>
              <WindowManagerProvider>
                <AppComponentsContext.Provider value={APP_COMPONENTS}>
                  <MusicProvider>{children}</MusicProvider>
                </AppComponentsContext.Provider>
              </WindowManagerProvider>
            </LayoutProvider>
          </ShellStateContext.Provider>
        </ShellDispatchContext.Provider>
      </WindowsStateContext.Provider>
    </WindowsDispatchContext.Provider>
  )
}
