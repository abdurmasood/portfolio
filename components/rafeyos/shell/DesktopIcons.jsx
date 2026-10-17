import { forwardRef, memo, useCallback, useMemo, useRef } from 'react'
import { useShellDispatch, useVfs, useWindowManager } from '../state/contexts'
import { displayName, isDir } from '../vfs/queries'
import { FileIcon } from '../icons/FileIcon'
import { useOpenPath } from './useOpenPath'
import { useIconDrag } from './useIconDrag'
import { pointOfEvent, useMenu } from './useMenu'
import { pathCommands } from './pathCommands'
import { fileMenuItems } from './menus'
import { useTrashActions } from './useTrashActions'
import { rectOfElement } from '../wm/windowAnimations'
import { nearestInDirection } from './keyboardNavigation'

export const nextSelection = (selection, path, adding) => {
  if (adding) {
    return selection.includes(path) ? selection.filter((other) => other !== path) : [...selection, path]
  }
  return selection.includes(path) ? selection : [path]
}

const DesktopIcon = memo(function DesktopIcon({ path, position, selected, handlers }) {
  const { vfs } = useVfs()
  const pointerType = useRef('mouse')
  const open = (event) => handlers.open(path, { from: rectOfElement(event.currentTarget) })
  return (
    <div
      className={selected ? 'dicon sel' : 'dicon'}
      style={{ left: position.x, top: position.y }}
      role="option"
      aria-selected={selected}
      data-path={path}
      onPointerDown={(event) => {
        pointerType.current = event.pointerType
        handlers.press(path, event)
      }}
      onClick={(event) => pointerType.current === 'touch' && !handlers.dragged() && open(event)}
      onDoubleClick={open}
      onContextMenu={(event) => handlers.menu(path, event)}
    >
      <FileIcon vfs={vfs} path={path} />
      <span className="nm">{displayName(vfs, path)}</span>
    </div>
  )
})

/** Right-click: select just this icon and open its file menu. */
const useIconMenu = (onSelect) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const openPath = useOpenPath()
  const openMenu = useMenu()
  const trashActions = useTrashActions()
  return useCallback(
    (path, event) => {
      event.preventDefault()
      event.stopPropagation()
      onSelect([path])
      const commands = { ...pathCommands({ vfs, windowManager, openPath }, path), ...trashActions(path) }
      openMenu(fileMenuItems({ commands, isFolder: isDir(vfs, path), onDesktop: true }), pointOfEvent(event))
    },
    [vfs, windowManager, openPath, openMenu, onSelect, trashActions],
  )
}

/** Press selects (Ctrl/⌘/Shift toggles) and starts dragging the selection. */
const usePress = ({ selection, onSelect, drag }) => {
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  return useCallback(
    (path, event) => {
      if (event.button !== 0) return
      event.preventDefault()
      shellDispatch({ type: 'closeTransients' })
      windowManager.focus(null)
      const next = nextSelection(selection, path, event.ctrlKey || event.metaKey || event.shiftKey)
      onSelect(next)
      if (next.includes(path)) drag.start(event, next)
    },
    [selection, onSelect, drag, shellDispatch, windowManager],
  )
}

/** Tab reaches the icons; arrows move the selection to the nearest icon that way, Enter opens it. */
const useIconKeys = ({ positions, selection, onSelect, openPath }) =>
  useCallback(
    (event) => {
      if (event.key === 'Enter' && selection.length) {
        event.preventDefault()
        openPath(selection[0])
        return
      }
      const current = positions.findIndex((position) => position.path === selection[selection.length - 1])
      const next = nearestInDirection(positions, current, event.key)
      if (next === null) return
      event.preventDefault()
      onSelect([positions[next].path])
    },
    [positions, selection, onSelect, openPath],
  )

/**
 * Home plus ~/Desktop's entries. Single click selects, double click opens, drag moves the selection.
 * @param {{ model: object, selection: string[], onSelect: Function }} props - model from useDesktopIconModel
 */
export const DesktopIcons = forwardRef(function DesktopIcons({ model, selection, onSelect }, layerRef) {
  const openPath = useOpenPath()
  const drag = useIconDrag({ layerRef, positionOf: model.positionOf, onCommit: model.place })
  const press = usePress({ selection, onSelect, drag })
  const menu = useIconMenu(onSelect)
  const handlers = useMemo(() => ({ press, menu, open: openPath, dragged: drag.dragged }), [press, menu, openPath, drag])
  const onKeyDown = useIconKeys({ positions: model.positions, selection, onSelect, openPath })
  return (
    <div
      className="layer dicons"
      ref={layerRef}
      role="listbox"
      aria-label="Desktop"
      aria-multiselectable="true"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {model.positions.map((position) => (
        <DesktopIcon
          key={position.path}
          path={position.path}
          position={position}
          selected={selection.includes(position.path)}
          handlers={handlers}
        />
      ))}
    </div>
  )
})
