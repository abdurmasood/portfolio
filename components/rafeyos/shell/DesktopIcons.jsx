import { memo, useCallback, useMemo, useRef } from 'react'
import { useLayout, useSettings, useShellDispatch, useVfs, useWindowManager } from '../state/contexts'
import { HOME } from '../vfs/buildVfs'
import { children, displayName } from '../vfs/queries'
import { iconLayout } from './iconLayout'
import { FileIcon } from '../icons/FileIcon'
import { useOpenPath } from './useOpenPath'
import { rectOfElement } from '../wm/windowAnimations'

const DESKTOP = '~/Desktop'

const nextSelection = (selection, path, adding) => {
  if (adding) {
    return selection.includes(path) ? selection.filter((other) => other !== path) : [...selection, path]
  }
  return selection.includes(path) ? selection : [path]
}

const DesktopIcon = memo(function DesktopIcon({ path, position, selected, onPress, onOpen }) {
  const { vfs } = useVfs()
  const pointerType = useRef('mouse')
  const open = (event) => onOpen(path, { from: rectOfElement(event.currentTarget) })
  return (
    <div
      className={selected ? 'dicon sel' : 'dicon'}
      style={{ left: position.x, top: position.y }}
      data-path={path}
      onPointerDown={(event) => {
        pointerType.current = event.pointerType
        onPress(path, event)
      }}
      onClick={(event) => pointerType.current === 'touch' && open(event)}
      onDoubleClick={open}
    >
      <FileIcon vfs={vfs} path={path} />
      <span className="nm">{displayName(vfs, path)}</span>
    </div>
  )
})

/** Home plus ~/Desktop's entries, laid out from the chosen corner. Single click selects, double click opens. */
export const DesktopIcons = ({ selection, onSelect }) => {
  const { vfs } = useVfs()
  const { showHome, corner } = useSettings()
  const { area } = useLayout()
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  const openPath = useOpenPath()
  const paths = useMemo(() => [...(showHome ? [HOME] : []), ...children(vfs, DESKTOP)], [vfs, showHome])
  const positions = useMemo(() => iconLayout(paths, area, corner), [paths, area, corner])
  const press = useCallback(
    (path, event) => {
      if (event.button !== 0) return
      event.preventDefault()
      shellDispatch({ type: 'closeTransients' })
      windowManager.focus(null)
      const adding = event.ctrlKey || event.metaKey || event.shiftKey
      onSelect((current) => nextSelection(current, path, adding))
    },
    [shellDispatch, windowManager, onSelect],
  )
  return (
    <div className="layer dicons">
      {positions.map((position) => (
        <DesktopIcon
          key={position.path}
          path={position.path}
          position={position}
          selected={selection.includes(position.path)}
          onPress={press}
          onOpen={openPath}
        />
      ))}
    </div>
  )
}
