import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import { useVfs, useWindowManager } from '../../state/logic/contexts'
import { useOpenPath } from '../../shell/popups/logic/useOpenPath'
import { HOME } from '../../vfs/buildVfs'
import { realPath } from '../../vfs/paths'
import { isDir } from '../../vfs/queries'
import { FILE_VIEWS, filesReducer, initialFilesState } from './logic/filesReducer'
import { floatbarText, listItems, windowTitle } from './logic/filesView'
import { FilesSidebar } from './FilesSidebar'
import { FilesHeader } from './FilesHeader'
import { FilesEmpty, FilesGrid, FilesList } from './FilesItems'
import { useFilesMenus } from './logic/useFilesMenus'
import { gridColumns, gridStep } from '../../shell/menus/logic/keyboardNavigation'
import { SidebarToggle, splitClassName, useSidebarToggle } from '../../wm/SidebarToggle'

/** Folders navigate in place; other files go through useOpenPath (a banner until their apps exist). */
const useOpenItem = (vfs, dispatch) => {
  const openPath = useOpenPath()
  return (path) => (isDir(vfs, path) ? dispatch({ type: 'go', path: realPath(vfs, path) }) : openPath(path))
}

/** Arrows move the selection through the items (by rows in the grid), Home and End jump. */
const moveSelection = ({ state, dispatch, items, bodyRef }, event) => {
  const grid = bodyRef.current?.querySelector('.fgrid')
  const current = items.indexOf(state.selection[state.selection.length - 1])
  const next = gridStep(current, event.key, { count: items.length, columns: gridColumns(grid) })
  if (next === null) return
  event.preventDefault()
  dispatch({ type: 'select', path: items[next], mode: 'single' })
}

const keyHandler = (files) => (event) => {
  const { state, dispatch, openItem } = files
  if (event.target.matches('input')) return
  if (event.key === 'Enter' && state.selection.length) openItem(state.selection[0])
  if ((event.key === 'Backspace' || (event.altKey && event.key === 'ArrowLeft')) && state.back.length) {
    dispatch({ type: 'back' })
    return
  }
  if (!event.altKey) moveSelection(files, event)
}

/** Keyboard selection keeps the selected item in view. */
const useSelectionInView = (bodyRef, selection) => {
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body?.contains(document.activeElement)) return
    body.querySelector('.sel')?.scrollIntoView?.({ block: 'nearest' })
  }, [bodyRef, selection])
}

/** The folder's items: Tab focuses it, arrows select, Enter opens, a click on empty space deselects. */
const FilesBody = ({ files, menus }) => {
  const { vfs, state, dispatch, items } = files
  const bodyRef = useRef(null)
  const openItem = useOpenItem(vfs, dispatch)
  useSelectionInView(bodyRef, state.selection)
  const Items = state.view === FILE_VIEWS.GRID ? FilesGrid : FilesList
  return (
    <div
      ref={bodyRef}
      className="scroll fbody"
      tabIndex={0}
      aria-label="Files"
      onClick={() => dispatch({ type: 'select', mode: 'clear' })}
      onKeyDown={keyHandler({ state, dispatch, openItem, items, bodyRef })}
      onContextMenu={menus.backgroundMenu}
    >
      {items.length ? (
        <Items
          vfs={vfs}
          items={items}
          selection={state.selection}
          onSelect={(path, mode) => dispatch({ type: 'select', path, mode })}
          onOpen={openItem}
          onMenu={menus.itemMenu}
        />
      ) : (
        <FilesEmpty state={state} />
      )}
    </div>
  )
}

/** "Show in Files" opens the folder with the file already selected. */
const initialState = ({ path, select }) => initialFilesState(path, select ? [select] : [])

/** GNOME Files: places sidebar, header bar, grid or list view, selection float bar, context menus. */
export const FilesApp = ({ windowId, arg, init }) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const [state, dispatch] = useReducer(filesReducer, { path: arg || HOME, select: init?.select }, initialState)
  const sidebar = useSidebarToggle()
  const items = useMemo(() => listItems(vfs, state), [vfs, state])
  const menus = useFilesMenus({ state, dispatch, items })
  const title = windowTitle(vfs, state)
  useEffect(() => windowManager.setTitle(windowId, title), [windowManager, windowId, title])
  const floatbar = floatbarText(vfs, state.selection)
  return (
    <div className={splitClassName(sidebar)}>
      <FilesSidebar
        path={state.path}
        searching={state.search !== null}
        onGo={(path) => {
          sidebar.close()
          dispatch({ type: 'go', path })
        }}
        onMainMenu={menus.mainMenu}
      />
      <div className="main">
        <FilesHeader
          vfs={vfs}
          state={state}
          dispatch={dispatch}
          onViewOptions={menus.viewOptions}
          sidebarToggle={<SidebarToggle sidebar={sidebar} />}
        />
        <FilesBody files={{ vfs, state, dispatch, items }} menus={menus} />
        {floatbar && <div className="floatbar">{floatbar}</div>}
      </div>
    </div>
  )
}
