import { useVfs, useWindowManager } from '../../state/contexts'
import { useOpenPath } from '../../shell/popups/js/useOpenPath'
import { belowElement, pointOfEvent, useMenu } from '../../shell/menus/js/useMenu'
import { pathCommands } from '../../shell/menus/js/pathCommands'
import { fileMenuItems } from '../../shell/menus/js/menus'
import { useEmptyTrash, useTrashActions } from '../../shell/menus/js/useTrashActions'
import { TRASH } from '../../vfs/buildVfs'
import { isDir } from '../../vfs/queries'
import { backgroundMenuItems, mainMenuItems, viewOptionsItems } from './filesMenus'
import { projectForPath } from '../../vfs/projectPaths'

// View options sits near the window's right edge, so it opens inwards (mockup offset)
const VIEW_OPTIONS_SHIFT = 120

/**
 * Opens one Files window's menus: an item's, the folder background's, View options and the main menu.
 * @param {{ state: object, dispatch: Function, items: string[] }} files - the window's reducer and listing
 */
export const useFilesMenus = ({ state, dispatch, items }) => {
  const { vfs, content } = useVfs()
  const windowManager = useWindowManager()
  const openPath = useOpenPath()
  const openMenu = useMenu()
  const trashActions = useTrashActions()
  const emptyTrash = useEmptyTrash()
  const inTrash = state.path === TRASH
  const commandsFor = (path) => ({ ...pathCommands({ vfs, windowManager, openPath }, path), ...trashActions(path) })
  // A project's .txt opens in the Text Editor; the menu also offers its 3D view
  const openInProjectsFor = (path) => {
    const project = projectForPath({ vfs, content }, path)
    return project ? () => windowManager.openApp('projects', { init: { slug: project.slug } }) : null
  }
  const itemMenu = (path, event) => {
    if (!state.selection.includes(path)) dispatch({ type: 'select', path, mode: 'single' })
    const commands = { ...commandsFor(path), openInProjects: openInProjectsFor(path), ...(inTrash ? { emptyTrash } : {}) }
    const menu = fileMenuItems({ commands, isFolder: isDir(vfs, path), onDesktop: false })
    openMenu(menu, pointOfEvent(event))
  }
  const backgroundMenu = (event) => {
    event.preventDefault()
    // Recent and Starred aren't folders, so they have no background menu
    if (!vfs[state.path]) return
    const { openTerminal, properties } = commandsFor(state.path)
    const selectAll = () => dispatch({ type: 'selectAll', paths: items })
    openMenu(backgroundMenuItems({ inTrash, selectAll, openTerminal, properties, emptyTrash }), pointOfEvent(event))
  }
  const viewOptions = (event) => {
    const setView = (view) => dispatch({ type: 'setView', view })
    openMenu(viewOptionsItems(setView), belowElement(event.currentTarget, VIEW_OPTIONS_SHIFT))
  }
  const mainMenu = (event) => {
    const newWindow = () => windowManager.openApp('files', { path: state.path })
    openMenu(mainMenuItems(newWindow), belowElement(event.currentTarget))
  }
  return { itemMenu, backgroundMenu, viewOptions, mainMenu }
}
