// @ts-check
import { useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { useOpenPath } from '@/components/rafeyos/ui/popups/logic/useOpenPath'
import { belowElement, pointOfEvent, useMenu } from '@/components/rafeyos/ui/menus/logic/useMenu'
import { pathCommands } from '@/components/rafeyos/ui/menus/logic/pathCommands'
import { fileMenuItems } from '@/components/rafeyos/ui/menus/logic/menus'
import { useEmptyTrash, useTrashActions } from '@/components/rafeyos/ui/menus/logic/useTrashActions'
import { TRASH } from '@/components/rafeyos/core/vfs/buildVfs'
import { isDir } from '@/components/rafeyos/core/vfs/queries'
import { backgroundMenuItems, mainMenuItems, viewOptionsItems } from './filesMenus'
import { FILES_ACTIONS } from './filesReducer'
import { projectForPath } from '@/components/rafeyos/core/vfs/projectPaths'
import { APP } from '@/components/rafeyos/core/catalog/apps'

/**
 * @import { Dispatch, MouseEvent } from 'react'
 * @import { FilesAction, FilesState } from './filesReducer'
 */

// View options sits near the window's right edge, so it opens inwards (mockup offset)
const VIEW_OPTIONS_SHIFT = 120

/**
 * Opens one Files window's menus: an item's, the folder background's, View options and the main menu.
 * @param {{ state: FilesState, dispatch: Dispatch<FilesAction>, items: string[] }} files - the window's reducer and listing
 */
export const useFilesMenus = ({ state, dispatch, items }) => {
  const { vfs, content } = useVfs()
  const windowManager = useWindowManager()
  const openPath = useOpenPath()
  const openMenu = useMenu()
  const trashActions = useTrashActions()
  const emptyTrash = useEmptyTrash()
  const inTrash = state.path === TRASH
  /** @param {string} path */
  const commandsFor = (path) => ({ ...pathCommands({ vfs, windowManager, openPath }, path), ...trashActions(path) })
  // A project's .txt opens in the Text Editor; the menu also offers its 3D view
  /** @param {string} path */
  const openInProjectsFor = (path) => {
    const project = projectForPath({ vfs, content }, path)
    return project ? () => windowManager.openApp(APP.PROJECTS, { init: { slug: project.slug } }) : null
  }
  /**
   * @param {string} path
   * @param {MouseEvent} event
   */
  const itemMenu = (path, event) => {
    if (!state.selection.includes(path)) dispatch({ type: FILES_ACTIONS.SELECT, path, mode: 'single' })
    const commands = { ...commandsFor(path), openInProjects: openInProjectsFor(path), ...(inTrash ? { emptyTrash } : {}) }
    const menu = fileMenuItems({ commands, isFolder: isDir(vfs, path), onDesktop: false })
    openMenu(menu, pointOfEvent(event))
  }
  /** @param {MouseEvent} event */
  const backgroundMenu = (event) => {
    event.preventDefault()
    // Recent and Starred aren't folders, so they have no background menu
    if (!vfs[state.path]) return
    const { openTerminal, properties } = commandsFor(state.path)
    const selectAll = () => dispatch({ type: FILES_ACTIONS.SELECT_ALL, paths: items })
    openMenu(backgroundMenuItems({ inTrash, selectAll, openTerminal, properties, emptyTrash }), pointOfEvent(event))
  }
  /** @param {MouseEvent} event */
  const viewOptions = (event) => {
    /** @param {FilesState['view']} view */
    const setView = (view) => dispatch({ type: FILES_ACTIONS.SET_VIEW, view })
    openMenu(viewOptionsItems(setView), belowElement(event.currentTarget, VIEW_OPTIONS_SHIFT))
  }
  /** @param {MouseEvent} event */
  const mainMenu = (event) => {
    const newWindow = () => windowManager.openApp(APP.FILES, { path: state.path })
    openMenu(mainMenuItems(newWindow), belowElement(event.currentTarget))
  }
  return { itemMenu, backgroundMenu, viewOptions, mainMenu }
}
