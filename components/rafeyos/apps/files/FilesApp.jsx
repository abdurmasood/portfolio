import { useEffect, useMemo, useReducer } from 'react'
import { useVfs, useWindowManager } from '../../state/contexts'
import { useOpenPath } from '../../shell/useOpenPath'
import { HOME } from '../../vfs/buildVfs'
import { realPath } from '../../vfs/paths'
import { isDir } from '../../vfs/queries'
import { FILE_VIEWS, filesReducer, initialFilesState } from './filesReducer'
import { floatbarText, listItems, windowTitle } from './filesView'
import { FilesSidebar } from './FilesSidebar'
import { FilesHeader } from './FilesHeader'
import { FilesEmpty, FilesGrid, FilesList } from './FilesItems'

/** Folders navigate in place; other files go through useOpenPath (a banner until their apps exist). */
const useOpenItem = (vfs, dispatch) => {
  const openPath = useOpenPath()
  return (path) => (isDir(vfs, path) ? dispatch({ type: 'go', path: realPath(vfs, path) }) : openPath(path))
}

const keyHandler = ({ state, dispatch, openItem }) => (event) => {
  if (event.target.matches('input')) return
  if (event.key === 'Enter' && state.selection.length) openItem(state.selection[0])
  if ((event.key === 'Backspace' || (event.altKey && event.key === 'ArrowLeft')) && state.back.length) {
    dispatch({ type: 'back' })
  }
}

/** GNOME Files: places sidebar, header bar, grid or list view, selection float bar. */
export const FilesApp = ({ windowId, arg }) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const [state, dispatch] = useReducer(filesReducer, arg || HOME, initialFilesState)
  const items = useMemo(() => listItems(vfs, state), [vfs, state])
  const openItem = useOpenItem(vfs, dispatch)
  const title = windowTitle(vfs, state)
  useEffect(() => windowManager.setTitle(windowId, title), [windowManager, windowId, title])
  const onSelect = (path, mode) => dispatch({ type: 'select', path, mode })
  const Items = state.view === FILE_VIEWS.GRID ? FilesGrid : FilesList
  const floatbar = floatbarText(vfs, state.selection)
  return (
    <div className="split">
      <FilesSidebar path={state.path} searching={state.search !== null} onGo={(path) => dispatch({ type: 'go', path })} />
      <div className="main">
        <FilesHeader vfs={vfs} state={state} dispatch={dispatch} />
        <div
          className="scroll fbody"
          tabIndex={0}
          onClick={() => dispatch({ type: 'select', mode: 'clear' })}
          onKeyDown={keyHandler({ state, dispatch, openItem })}
        >
          {items.length ? (
            <Items vfs={vfs} items={items} selection={state.selection} onSelect={onSelect} onOpen={openItem} />
          ) : (
            <FilesEmpty state={state} />
          )}
        </div>
        {floatbar && <div className="floatbar">{floatbar}</div>}
      </div>
    </div>
  )
}
