// One desktop session's state: windows and transient shell UI, each with separate state and
// dispatch contexts, plus layout, the window manager and the music player built on top of them.
// Settings live above (SettingsProvider), so they survive a restart.
import { useReducer } from 'react'
import { ShellDispatchContext, ShellStateContext, WindowsDispatchContext, WindowsStateContext } from './logic/contexts'
import { initialWindows, windowsReducer } from './logic/windowsReducer'
import { initialShell, shellReducer } from './logic/shellReducer'
import { LayoutProvider } from './LayoutProvider'
import { WindowManagerProvider } from '../wm/WindowManagerProvider'
import { MusicProvider } from './MusicProvider'

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
                <MusicProvider>{children}</MusicProvider>
              </WindowManagerProvider>
            </LayoutProvider>
          </ShellStateContext.Provider>
        </ShellDispatchContext.Provider>
      </WindowsStateContext.Provider>
    </WindowsDispatchContext.Provider>
  )
}
