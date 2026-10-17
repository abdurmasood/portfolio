import { memo, useCallback } from 'react'
import { useDockRegistry, useLayout, useShellDispatch, useWindowManager, useWindowsState } from '../state/contexts'
import { DOCK_FAVORITES, getApp } from '../apps/registry'
import { isImplemented } from '../apps/availability'
import { runningApps, windowsForApp } from '../state/selectors'
import { TRASH } from '../vfs/buildVfs'
import { AppIcon } from '../icons/appIcons'
import { rectOfElement } from '../wm/windowAnimations'

const MAX_DOTS = 4

/** Favourites with a UI, then running apps that aren't favourites. */
export const dockApps = (windows) => [
  ...DOCK_FAVORITES.filter(isImplemented),
  ...runningApps(windows).filter((id) => !DOCK_FAVORITES.includes(id) && getApp(id).inDock),
]

const DockButton = memo(function DockButton({ appId, count, focused, onActivate }) {
  const registry = useDockRegistry()
  const { name } = getApp(appId)
  const register = useCallback(
    (element) => (element ? registry.set(appId, element) : registry.delete(appId)),
    [registry, appId],
  )
  return (
    <button
      type="button"
      ref={register}
      className={focused ? 'dk focused' : 'dk'}
      data-name={name}
      aria-label={name}
      onClick={(event) => onActivate(appId, rectOfElement(event.currentTarget))}
    >
      <AppIcon name={appId} />
      {count > 0 && (
        <span className="dots" data-testid={`dots-${appId}`}>
          {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => <i key={i} />)}
        </span>
      )}
    </button>
  )
})

export const Dock = () => {
  const windows = useWindowsState()
  const { dockPos } = useLayout()
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  const focusedApp = windows.byId[windows.focusedId]?.appId ?? null
  const activate = useCallback(
    (appId, from) => {
      shellDispatch({ type: 'closeTransients' })
      windowManager.activateApp(appId, from)
    },
    [shellDispatch, windowManager],
  )
  const openTrash = (event) => {
    shellDispatch({ type: 'closeTransients' })
    windowManager.openApp('files', { path: TRASH, from: rectOfElement(event.currentTarget) })
  }
  return (
    <div className={`dock ${dockPos}`} role="toolbar" aria-label="Dock">
      {dockApps(windows).map((appId) => (
        <DockButton
          key={appId}
          appId={appId}
          count={windowsForApp(windows, appId).length}
          focused={focusedApp === appId}
          onActivate={activate}
        />
      ))}
      <div className="grow" />
      <div className="dsep" />
      <button type="button" className="dk" data-name="Trash" aria-label="Trash" onClick={openTrash}>
        <AppIcon name="trash" />
      </button>
      {/* The app grid arrives with the Activities overview in P4 */}
      <button type="button" className="dk" data-name="Show Apps" aria-label="Show Apps">
        <AppIcon name="apps" />
      </button>
    </div>
  )
}
