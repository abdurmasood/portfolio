import { useCallback, useMemo, useRef, useState } from 'react'
import { useSettings, useShellDispatch, useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { WALLS } from '@/components/rafeyos/core/theme/walls'
import { DesktopIcons } from './DesktopIcons'
import { DESKTOP, useDesktopIconModel } from './logic/useDesktopIconModel'
import { useRubberBand } from './logic/useRubberBand'
import { pointOfEvent, useMenu } from '@/components/rafeyos/ui/menus/logic/useMenu'
import { wallMenuItems } from '@/components/rafeyos/ui/menus/logic/menus'
import { useOpenSettings } from '@/components/rafeyos/shell/logic/useOpenSettings'
import { SETTINGS_PAGES } from '@/components/rafeyos/core/catalog/settingsPages'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { APP } from '@/components/rafeyos/core/catalog/apps'

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
        showDesktop: () => windowManager.openApp(APP.FILES, { path: DESKTOP }),
        openTerminal: () => windowManager.openApp(APP.TERMINAL, { path: DESKTOP }),
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
  const { vfs } = useVfs()
  const model = useDesktopIconModel()
  const [selection, setSelection] = useState([])
  // Icons the shell deleted leave the selection, so Enter and a drag only see what is still there
  if (selection.some((path) => !vfs[path])) setSelection(selection.filter((path) => vfs[path]))
  const layerRef = useRef(null)
  const bandRef = useRef(null)
  const startBand = useRubberBand({ bandRef, layerRef, onSelect: setSelection })
  const { paths } = model
  const selectAll = useMemo(() => () => setSelection(paths), [paths])
  const openWallMenu = useWallMenu(selectAll)
  const pressWall = (event) => {
    if (event.button !== 0) return
    shellDispatch({ type: SHELL_ACTIONS.CLOSE_TRANSIENTS })
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
