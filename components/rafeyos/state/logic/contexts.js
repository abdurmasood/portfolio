// Context objects and their hooks. State and dispatch are separate contexts so components
// that only dispatch never re-render on state changes.
import { createContext, useContext } from 'react'

const named = (name) => {
  const context = createContext(null)
  context.displayName = name
  return context
}

export const ServicesContext = named('Services')
export const VfsContext = named('Vfs')
export const SessionDispatchContext = named('SessionDispatch')
export const WindowsStateContext = named('WindowsState')
export const WindowsDispatchContext = named('WindowsDispatch')
export const SettingsStateContext = named('SettingsState')
export const SettingsDispatchContext = named('SettingsDispatch')
export const WifiLinkContext = named('WifiLink')
export const ShellStateContext = named('ShellState')
export const ShellDispatchContext = named('ShellDispatch')
export const LayoutContext = named('Layout')
export const WindowManagerContext = named('WindowManager')
export const DockRegistryContext = named('DockRegistry')
// Injected from the session layer so the window manager never imports the apps it hosts
export const AppComponentsContext = named('AppComponents')
// Music state ticks every second while playing, so it has its own context; controls are stable
export const MusicStateContext = named('MusicState')
export const MusicControlsContext = named('MusicControls')

const useRequired = (context) => {
  const value = useContext(context)
  if (value === null) throw new Error(`${context.displayName} used outside its provider`)
  return value
}

export const useServices = () => useRequired(ServicesContext)
/** @returns {{ vfs: object, content: object, saveDocument: Function, trashDocument: Function, restoreDocument: Function, emptyTrashDocument: Function }} */
export const useVfs = () => useRequired(VfsContext)
export const useSessionDispatch = () => useRequired(SessionDispatchContext)
export const useWindowsState = () => useRequired(WindowsStateContext)
export const useWindowsDispatch = () => useRequired(WindowsDispatchContext)
export const useSettings = () => useRequired(SettingsStateContext)
export const useSettingsDispatch = () => useRequired(SettingsDispatchContext)
/** @returns {{ searching: boolean, arc: number }} arc is the sweep frame while searching */
export const useWifiLink = () => useRequired(WifiLinkContext)
export const useShellState = () => useRequired(ShellStateContext)
export const useShellDispatch = () => useRequired(ShellDispatchContext)
/** @returns {{ viewport, compact, dockPos, iconSize, dockSize, area }} */
export const useLayout = () => useRequired(LayoutContext)
export const useWindowManager = () => useRequired(WindowManagerContext)
/** @returns {Map<string, HTMLElement>} app id -> dock button, the minimize/open animation anchor */
export const useDockRegistry = () => useRequired(DockRegistryContext)
/** @returns {Record<string, Function>} app id -> app UI component */
export const useAppComponents = () => useRequired(AppComponentsContext)
/** @returns {{ playing: boolean, position: number, played: boolean }} */
export const useMusic = () => useRequired(MusicStateContext)
/** @returns {{ play, pause, toggle, seek, prev, next }} stable for the desktop's lifetime */
export const useMusicControls = () => useRequired(MusicControlsContext)
