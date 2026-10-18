import { useRef } from 'react'
import { FileIcon } from '../../icons/FileIcon'
import { Sym } from '../../icons/symbols'
import { displayName, sizeLabel } from '../../vfs/queries'
import { emptyState, typeLabel } from './logic/filesView'

/** Click selects (Ctrl/⌘ toggles), double click opens, a tap opens on touch, right-click opens its menu. */
const useItemHandlers = ({ onSelect, onOpen, onMenu }) => {
  const pointerType = useRef('mouse')
  return (path) => ({
    'data-path': path,
    onPointerDown: (event) => {
      pointerType.current = event.pointerType
    },
    onClick: (event) => {
      event.stopPropagation()
      onSelect(path, event.ctrlKey || event.metaKey ? 'toggle' : 'single')
      if (pointerType.current === 'touch') onOpen(path)
    },
    onDoubleClick: () => onOpen(path),
    onContextMenu: (event) => {
      event.preventDefault()
      event.stopPropagation()
      onMenu(path, event)
    },
  })
}

export const FilesGrid = ({ vfs, items, selection, onSelect, onOpen, onMenu }) => {
  const handlersFor = useItemHandlers({ onSelect, onOpen, onMenu })
  return (
    <div className="fgrid" role="listbox" aria-label="Items" aria-multiselectable="true">
      {items.map((path) => (
        <div
          key={path}
          role="option"
          aria-selected={selection.includes(path)}
          className={selection.includes(path) ? 'fitem sel' : 'fitem'}
          {...handlersFor(path)}
        >
          <FileIcon vfs={vfs} path={path} />
          <span className="nm">{displayName(vfs, path)}</span>
        </div>
      ))}
    </div>
  )
}

export const FilesList = ({ vfs, items, selection, onSelect, onOpen, onMenu }) => {
  const handlersFor = useItemHandlers({ onSelect, onOpen, onMenu })
  return (
    <div className="flist" role="listbox" aria-label="Items" aria-multiselectable="true">
      <div className="flh" aria-hidden="true">
        <span>Name</span>
        <span>Size</span>
        <span>Type</span>
      </div>
      {items.map((path) => (
        <div
          key={path}
          role="option"
          aria-selected={selection.includes(path)}
          className={selection.includes(path) ? 'flr sel' : 'flr'}
          {...handlersFor(path)}
        >
          <span className="n">
            <FileIcon vfs={vfs} path={path} />
            <span>{displayName(vfs, path)}</span>
          </span>
          <span className="m">{sizeLabel(vfs, path)}</span>
          <span className="m">{typeLabel(vfs, path)}</span>
        </div>
      ))}
    </div>
  )
}

export const FilesEmpty = ({ state }) => {
  const { icon, title, body } = emptyState(state)
  return (
    <div className="empty">
      <Sym name={icon} />
      <b>{title}</b>
      {body && <span>{body}</span>}
    </div>
  )
}
