import { memo, useCallback } from 'react'
import { useDockRegistry, useLayout, useShellDispatch, useShellState, useVfs, useWindowManager, useWindowsState } from '@/components/rafeyos/state/logic/contexts'
import { DOCK_FAVORITES, getApp, isImplemented } from '@/components/rafeyos/core/catalog/apps'
import { runningApps, windowsForApp } from '@/components/rafeyos/state/logic/selectors'
import { TRASH } from '@/components/rafeyos/core/vfs/buildVfs'
import { children } from '@/components/rafeyos/core/vfs/queries'
import { AppIcon } from '@/components/rafeyos/ui/icons/appIcons'
import { rectOfElement } from '@/components/rafeyos/ui/logic/dom'
import { useMenu } from '@/components/rafeyos/ui/menus/logic/useMenu'
import { dockMenuItems, dockMenuPlacement } from '@/components/rafeyos/ui/menus/logic/menus'
import { menuItem } from '@/components/rafeyos/ui/menus/logic/menuItems'
import { useEmptyTrash } from '@/components/rafeyos/ui/menus/logic/useTrashActions'
import { OVERVIEW_MODES } from '@/components/rafeyos/wm/logic/overviewModel'

const MAX_DOTS = 4

/** Favourites with a UI, then running apps that aren't favourites. */
export const dockApps = (windows) => [
  ...DOCK_FAVORITES.filter(isImplemented),
  ...runningApps(windows).filter((id) => !DOCK_FAVORITES.includes(id) && getApp(id).inDock),
]

const DockButton = memo(function DockButton({ appId, count, focused, onActivate, onMenu }) {
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
      onContextMenu={(event) => {
        event.preventDefault()
        onMenu(appId, rectOfElement(event.currentTarget))
      }}
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

/** Right-click on a dock icon: the shell-styled menu beside (or above) the dock. */
const useDockMenu = (windows, dockPos) => {
  const windowManager = useWindowManager()
  const openMenu = useMenu()
  return useCallback(
    (appId, buttonRect) => {
      const appWindows = windowsForApp(windows, appId)
      const items = dockMenuItems({
        windows: appWindows,
        show: (win) => (win.minimized ? windowManager.restore(win.id) : windowManager.focus(win.id)),
        newWindow: () => windowManager.openApp(appId),
        quit: () => appWindows.forEach((win) => windowManager.close(win.id)),
      })
      const { point, anchorBottom } = dockMenuPlacement(buttonRect, dockPos)
      openMenu(items, point, { shell: true, anchorBottom })
    },
    [windows, dockPos, windowManager, openMenu],
  )
}

/** Show Apps opens the overview's app grid, or closes it when the grid is already up. */
const ShowAppsButton = () => {
  const { overview } = useShellState()
  const shellDispatch = useShellDispatch()
  const showing = overview?.mode === OVERVIEW_MODES.APPS
  return (
    <button
      type="button"
      className={showing ? 'dk focused' : 'dk'}
      data-name="Show Apps"
      aria-label="Show Apps"
      aria-pressed={showing}
      onClick={() => shellDispatch(showing ? { type: 'closeOverview' } : { type: 'openOverview', mode: OVERVIEW_MODES.APPS })}
    >
      <AppIcon name="apps" />
    </button>
  )
}

export const Dock = () => {
  const { vfs } = useVfs()
  const windows = useWindowsState()
  const { dockPos } = useLayout()
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  const openDockMenu = useDockMenu(windows, dockPos)
  const openMenu = useMenu()
  const emptyTrash = useEmptyTrash()
  const focusedApp = windows.byId[windows.focusedId]?.appId ?? null
  // Dock clicks leave the overview first, then act as usual
  const leaveShell = useCallback(() => {
    shellDispatch({ type: 'closeTransients' })
    shellDispatch({ type: 'closeOverview' })
  }, [shellDispatch])
  const activate = useCallback(
    (appId, from) => {
      leaveShell()
      windowManager.activateApp(appId, from)
    },
    [leaveShell, windowManager],
  )
  const openTrash = (event) => {
    leaveShell()
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
          onMenu={openDockMenu}
        />
      ))}
      <div className="grow" />
      <div className="dsep" />
      <button
        type="button"
        className="dk"
        data-name="Trash"
        aria-label="Trash"
        onClick={openTrash}
        onContextMenu={(event) => {
          event.preventDefault()
          const { point, anchorBottom } = dockMenuPlacement(rectOfElement(event.currentTarget), dockPos)
          openMenu([menuItem('Empty Trash', emptyTrash)], point, { shell: true, anchorBottom })
        }}
      >
        <AppIcon name="trash" full={children(vfs, TRASH).length > 0} />
      </button>
      <ShowAppsButton />
    </div>
  )
}
