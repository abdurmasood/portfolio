import { useCallback, useMemo, useRef, useState } from 'react'
import { useSettings, useShellDispatch, useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { WALLS } from '@/components/rafeyos/core/theme/walls'
import { DesktopIcons } from './DesktopIcons'
import { DESKTOP, useDesktopIconModel } from './logic/useDesktopIconModel'
import { DEFAULT_ICON_CELL } from './logic/iconLayout'
import { useRubberBand } from './logic/useRubberBand'
import { pointOfEvent, useMenu } from '@/components/rafeyos/ui/menus/logic/useMenu'
import { wallMenuItems } from '@/components/rafeyos/ui/menus/logic/menus'
import { useNameActions } from '@/components/rafeyos/ui/menus/logic/useNameActions'
import { useOpenSettings } from '@/components/rafeyos/shell/logic/useOpenSettings'
import { SETTINGS_PAGES } from '@/components/rafeyos/core/catalog/settingsPages'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { APP } from '@/components/rafeyos/core/catalog/apps'

/** Where an icon made by a right-click sits: centred on the point, as the desktop drops it there. */
const cellAt = (point) => ({ x: point.x - DEFAULT_ICON_CELL.w / 2, y: point.y - DEFAULT_ICON_CELL.h / 2 })

/** Right-click on the wallpaper. onCreated gets a folder New Folder made, and the point it was asked for at. */
const useWallMenu = (selectAll, onCreated) => {
  const windowManager = useWindowManager()
  const openMenu = useMenu()
  const openSettings = useOpenSettings()
  const { newFolderIn } = useNameActions()
  return useCallback(
    (event) => {
      event.preventDefault()
      const point = pointOfEvent(event)
      const items = wallMenuItems({
        newFolder: newFolderIn(DESKTOP, { ...point, w: 0, h: 0 }, (path) => onCreated(path, point)),
        selectAll,
        showDesktop: () => windowManager.openApp(APP.FILES, { path: DESKTOP }),
        openTerminal: () => windowManager.openApp(APP.TERMINAL, { path: DESKTOP }),
        changeBackground: () => openSettings(SETTINGS_PAGES.APPEARANCE),
        iconSettings: () => openSettings(SETTINGS_PAGES.DESKTOP),
      })
      openMenu(items, point)
    },
    [selectAll, onCreated, windowManager, openMenu, openSettings, newFolderIn],
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
  const { paths, place } = model
  const selectAll = useMemo(() => () => setSelection(paths), [paths])
  const onCreated = useCallback((path, point) => {
    place({ [path]: cellAt(point) })
    setSelection([path])
  }, [place])
  const openWallMenu = useWallMenu(selectAll, onCreated)
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
