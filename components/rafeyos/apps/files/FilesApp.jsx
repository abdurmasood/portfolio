// @ts-check
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import { useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { useOpenPath } from '@/components/rafeyos/ui/popups/logic/useOpenPath'
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { realPath } from '@/components/rafeyos/core/vfs/paths'
import { isDir } from '@/components/rafeyos/core/vfs/queries'
import { FILE_VIEWS, FILES_ACTIONS, filesReducer, initialFilesState } from './logic/filesReducer'
import { floatbarText, isShowable, listItems, nearestFolder, windowTitle } from './logic/filesView'
import { FilesSidebar } from './FilesSidebar'
import { FilesHeader } from './FilesHeader'
import { FilesEmpty, FilesGrid, FilesList } from './FilesItems'
import { useFilesMenus } from './logic/useFilesMenus'
import { isTrashed } from '@/components/rafeyos/ui/menus/logic/visitorItems'
import { gridColumns, gridStep } from '@/components/rafeyos/ui/menus/logic/keyboardNavigation'
import { SidebarToggle, splitClassName, useSidebarToggle } from '@/components/rafeyos/wm/SidebarToggle'

/**
 * @import { Dispatch, KeyboardEvent, RefObject } from 'react'
 * @import { AppInitMap } from '@/components/rafeyos/core/catalog/apps'
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @import { FilesAction, FilesState } from './logic/filesReducer'
 */

/**
 * One window's reducer and listing, shared by its keyboard handling and body.
 * @typedef {{ vfs: Vfs, state: FilesState, dispatch: Dispatch<FilesAction>, items: string[] }} FilesWindow
 * @typedef {FilesWindow & { bodyRef: RefObject<HTMLDivElement>, openItem: (path: string) => unknown }} FilesKeyContext
 */

/**
 * Folders navigate in place; other files go through useOpenPath (a banner until their apps exist).
 * @param {Vfs} vfs
 * @param {Dispatch<FilesAction>} dispatch
 * @returns {(path: string) => unknown}
 */
// A trashed folder is one item to restore, not a place to go
const useOpenItem = (vfs, dispatch) => {
  const openPath = useOpenPath()
  return (path) => {
    if (!isDir(vfs, path)) openPath(path)
    else if (!isTrashed(vfs, path)) dispatch({ type: FILES_ACTIONS.GO, path: realPath(vfs, path) })
  }
}

/**
 * Arrows move the selection through the items (by rows in the grid), Home and End jump.
 * @param {Omit<FilesKeyContext, 'vfs' | 'openItem'>} files
 * @param {KeyboardEvent} event
 */
const moveSelection = ({ state, dispatch, items, bodyRef }, event) => {
  const grid = bodyRef.current?.querySelector('.fgrid')
  const current = items.indexOf(state.selection[state.selection.length - 1])
  const next = gridStep(current, event.key, { count: items.length, columns: gridColumns(grid) })
  if (next === null) return
  event.preventDefault()
  dispatch({ type: FILES_ACTIONS.SELECT, path: items[next], mode: 'single' })
}

/**
 * @param {Omit<FilesKeyContext, 'vfs'>} files
 * @returns {(event: KeyboardEvent) => void}
 */
const keyHandler = (files) => (event) => {
  const { state, dispatch, openItem } = files
  if (event.target instanceof Element && event.target.matches('input')) return
  if (event.key === 'Enter' && state.selection.length) openItem(state.selection[0])
  if ((event.key === 'Backspace' || (event.altKey && event.key === 'ArrowLeft')) && state.back.length) {
    dispatch({ type: FILES_ACTIONS.BACK })
    return
  }
  if (!event.altKey) moveSelection(files, event)
}

/**
 * Keyboard selection keeps the selected item in view.
 * @param {RefObject<HTMLDivElement>} bodyRef
 * @param {string[]} selection
 */
const useSelectionInView = (bodyRef, selection) => {
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body?.contains(document.activeElement)) return
    body.querySelector('.sel')?.scrollIntoView?.({ block: 'nearest' })
  }, [bodyRef, selection])
}

/**
 * The folder's items: Tab focuses it, arrows select, Enter opens, a click on empty space deselects.
 * @param {{ files: FilesWindow, menus: ReturnType<typeof useFilesMenus> }} props
 */
const FilesBody = ({ files, menus }) => {
  const { vfs, state, dispatch, items } = files
  /** @type {RefObject<HTMLDivElement>} */
  const bodyRef = useRef(null)
  const openItem = useOpenItem(vfs, dispatch)
  useSelectionInView(bodyRef, state.selection)
  const Items = state.view === FILE_VIEWS.GRID ? FilesGrid : FilesList
  return (
    <div
      ref={bodyRef}
      className="scroll fbody pane"
      tabIndex={0}
      aria-label="Files"
      onClick={() => dispatch({ type: FILES_ACTIONS.SELECT, mode: 'clear' })}
      onKeyDown={keyHandler({ state, dispatch, openItem, items, bodyRef })}
      onContextMenu={menus.backgroundMenu}
    >
      {items.length ? (
        <Items
          vfs={vfs}
          items={items}
          selection={state.selection}
          onSelect={(path, mode) => dispatch({ type: FILES_ACTIONS.SELECT, path, mode })}
          onOpen={openItem}
          onMenu={menus.itemMenu}
        />
      ) : (
        <FilesEmpty state={state} />
      )}
    </div>
  )
}

/**
 * Keeps the window on what still exists while the shell deletes underneath it: a deleted folder (or one replaced by a
 * file) sends the window up to the nearest one left, without a history entry, and the selection and history forget
 * whatever is gone.
 * @param {Vfs} vfs
 * @param {FilesState} state
 * @param {Dispatch<FilesAction>} dispatch
 */
const useFollowDeletes = (vfs, state, dispatch) => {
  const { path } = state
  useEffect(() => {
    if (!isShowable(vfs, path)) dispatch({ type: FILES_ACTIONS.GO, path: nearestFolder(vfs, path), fromHistory: true })
  }, [vfs, path, dispatch])
  useEffect(
    () => dispatch({ type: FILES_ACTIONS.PRUNE, exists: (other) => Boolean(vfs[other]), canShow: (other) => isShowable(vfs, other) }),
    [vfs, dispatch],
  )
}

/**
 * "Show in Files" opens the folder with the file already selected.
 * @param {{ path: string, select?: string }} launch
 */
const initialState = ({ path, select }) => initialFilesState(path, select ? [select] : [])

/**
 * GNOME Files: places sidebar, header bar, grid or list view, selection float bar, context menus.
 * @param {{ windowId: number, arg: string, init?: AppInitMap['files'] | null }} props
 */
export const FilesApp = ({ windowId, arg, init }) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const [state, dispatch] = useReducer(filesReducer, { path: arg || HOME, select: init?.select }, initialState)
  useFollowDeletes(vfs, state, dispatch)
  const sidebar = useSidebarToggle()
  const items = useMemo(() => listItems(vfs, state), [vfs, state])
  const menus = useFilesMenus({ state, dispatch, items })
  const title = windowTitle(vfs, state)
  useEffect(() => windowManager.setTitle(windowId, title), [windowManager, windowId, title])
  const floatbar = floatbarText(vfs, state.selection)
  return (
    <div className={splitClassName(sidebar)}>
      <FilesSidebar
        vfs={vfs}
        path={state.path}
        searching={state.search !== null}
        onGo={(path) => {
          sidebar.close()
          dispatch({ type: FILES_ACTIONS.GO, path })
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
