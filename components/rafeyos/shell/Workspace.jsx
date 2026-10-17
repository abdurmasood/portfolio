import { useCallback, useMemo, useRef, useState } from 'react'
import { useSettings, useShellDispatch, useWindowManager } from '../state/contexts'
import { WALLS } from '../theme/walls'
import { DesktopIcons } from './DesktopIcons'
import { DESKTOP, useDesktopIconModel } from './useDesktopIconModel'
import { useRubberBand } from './useRubberBand'
import { pointOfEvent, useMenu } from './useMenu'
import { wallMenuItems } from './menus'
import { useOpenSettings } from '../apps/settings/useOpenSettings'
import { SETTINGS_PAGES } from '../apps/settings/settingsPages'

/** Right-click on the wallpaper. */
const useWallMenu = (selectAll) => {
  const windowManager = useWindowManager()
  const openMenu = useMenu()
  const openSettings = useOpenSettings()
  return useCallback(
    (event) => {
      event.preventDefault()
      const items = wallMenuItems({
        selectAll,
        showDesktop: () => windowManager.openApp('files', { path: DESKTOP }),
        openTerminal: () => windowManager.openApp('terminal', { path: DESKTOP }),
        changeBackground: () => openSettings(SETTINGS_PAGES.APPEARANCE),
        iconSettings: () => openSettings(SETTINGS_PAGES.DESKTOP),
      })
      openMenu(items, pointOfEvent(event))
    },
    [selectAll, windowManager, openMenu, openSettings],
  )
}

/** Wallpaper plus desktop icons; a press on the wallpaper clears the selection, unfocuses windows and starts a band. */
export const Workspace = () => {
  const { wall } = useSettings()
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  const model = useDesktopIconModel()
  const [selection, setSelection] = useState([])
  const layerRef = useRef(null)
  const bandRef = useRef(null)
  const startBand = useRubberBand({ bandRef, layerRef, onSelect: setSelection })
  const { paths } = model
  const selectAll = useMemo(() => () => setSelection(paths), [paths])
  const openWallMenu = useWallMenu(selectAll)
  const pressWall = (event) => {
    if (event.button !== 0) return
    shellDispatch({ type: 'closeTransients' })
    windowManager.focus(null)
    setSelection([])
    startBand(event)
  }
  return (
    <>
      <div
        className="wall"
        style={{ background: (WALLS[wall] ?? WALLS[0]).css }}
        data-wall={(WALLS[wall] ?? WALLS[0]).name}
        onPointerDown={pressWall}
        onContextMenu={openWallMenu}
        data-testid="wallpaper"
      />
      <DesktopIcons ref={layerRef} model={model} selection={selection} onSelect={setSelection} />
      <div className="rubber" ref={bandRef} hidden />
    </>
  )
}
