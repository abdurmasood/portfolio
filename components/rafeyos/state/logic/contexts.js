// Context objects and their hooks. State and dispatch are separate contexts so components
// that only dispatch never re-render on state changes.
import { createContext, useContext } from 'react'

/**
 * Typed here so `// @ts-check` callers see the reducers' action unions and the window manager's API.
 * @import { Dispatch } from 'react'
 * @import { AppId, OpenApp } from '@/components/rafeyos/core/catalog/apps'
 * @import { Rect, SnapMode } from '@/components/rafeyos/core/geometry'
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { Content } from '@/components/rafeyos/core/vfs/content'
 * @import { FsFailure } from '@/components/rafeyos/core/vfs/fsState'
 * @import { ShellAction, ShellState } from './shellReducer'
 * @import { WindowAction, WindowsState } from './windowsReducer'
 * @import { SettingsAction, SettingsState } from './settingsReducer'
 */

/**
 * What wm/logic/windowManager.js provides. Declared at this layer so the context can carry it
 * without importing wm; createWindowManager is checked against it.
 * @typedef {Readonly<{
 *   focus: (id: number | null) => void,
 *   minimize: (id: number) => void,
 *   restore: (id: number) => void,
 *   close: (id: number, next?: () => void) => void,
 *   unsnap: (id: number, rect?: Rect) => void,
 *   commitRect: (id: number, rect: Rect) => void,
 *   openApp: OpenApp,
 *   openPath: (path: string, options?: { from?: Rect | null }) => boolean,
 *   snap: (id: number, mode: SnapMode) => void,
 *   toggleMax: (id: number) => void,
 *   remove: (id: number) => void,
 *   setTitle: (id: number, title: string) => void,
 *   setArg: (id: number, arg: string | null) => void,
 *   setCloseGuard: (id: number, guard: ((next?: () => void) => boolean | void) | null) => void,
 *   activateApp: (appId: AppId, from?: Rect | null) => boolean,
 *   openOrigin: (id: number) => Rect | null,
 *   snapPreview: Readonly<{ get: () => string | null, set: (mode: string | null) => void, subscribe: (listener: () => void) => () => void }>,
 * }>} WindowManager
 */

/**
 * What RafeyOSRoot provides: the merged tree and the visitor's file operations, which go through the fs store.
 * @typedef {{ ok: false, reason: FsFailure | 'full' | 'blocked' }} VfsFailure
 * @typedef {Readonly<{
 *   vfs: Vfs,
 *   content: Content,
 *   saveDocument: (folder: string, name: string, text: string) => { ok: true, name: string, path: string } | VfsFailure,
 *   trashDocument: (path: string) => { ok: true } | VfsFailure,
 *   restoreDocument: (path: string) => { ok: true, path: string } | VfsFailure,
 *   emptyTrashDocument: () => { ok: true } | VfsFailure,
 * }>} VfsApi
 */

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

/** @returns {ReturnType<typeof import('@/components/rafeyos/core/services/createServices').createServices>} */
export const useServices = () => useRequired(ServicesContext)
/** @returns {VfsApi} */
export const useVfs = () => useRequired(VfsContext)
export const useSessionDispatch = () => useRequired(SessionDispatchContext)
/** @returns {WindowsState} */
export const useWindowsState = () => useRequired(WindowsStateContext)
/** @returns {Dispatch<WindowAction>} */
export const useWindowsDispatch = () => useRequired(WindowsDispatchContext)
/** @returns {SettingsState} */
export const useSettings = () => useRequired(SettingsStateContext)
/** @returns {Dispatch<SettingsAction>} */
export const useSettingsDispatch = () => useRequired(SettingsDispatchContext)
/** @returns {{ searching: boolean, arc: number }} arc is the sweep frame while searching */
export const useWifiLink = () => useRequired(WifiLinkContext)
/** @returns {ShellState} */
export const useShellState = () => useRequired(ShellStateContext)
/** @returns {Dispatch<ShellAction>} */
export const useShellDispatch = () => useRequired(ShellDispatchContext)
/** @returns {{ viewport, compact, dockPos, iconSize, dockSize, area }} */
export const useLayout = () => useRequired(LayoutContext)
/** @returns {WindowManager} */
export const useWindowManager = () => useRequired(WindowManagerContext)
/** @returns {Map<string, HTMLElement>} app id -> dock button, the minimize/open animation anchor */
export const useDockRegistry = () => useRequired(DockRegistryContext)
/** @returns {Record<string, Function>} app id -> app UI component */
export const useAppComponents = () => useRequired(AppComponentsContext)
/** @returns {{ playing: boolean, position: number, played: boolean }} */
export const useMusic = () => useRequired(MusicStateContext)
/** @returns {{ play, pause, toggle, seek, prev, next }} stable for the desktop's lifetime */
export const useMusicControls = () => useRequired(MusicControlsContext)
