// Files' menus: the folder background, the header's View options and the sidebar's main menu.
import { SEPARATOR, disabledItem, menuItem } from '../../../shell/menus/logic/menuItems'
import { FILE_VIEWS } from './filesReducer'

/** Right-click on empty space in a folder. Trash has no terminal. */
export const backgroundMenuItems = ({ inTrash, selectAll, openTerminal, properties, emptyTrash = null }) => [
  disabledItem('New Folder…'),
  disabledItem('Paste'),
  menuItem('Select All', selectAll),
  SEPARATOR,
  menuItem('Open in Terminal', inTrash ? null : openTerminal),
  menuItem('Properties', properties),
  ...(inTrash ? [SEPARATOR, menuItem('Empty Trash', emptyTrash)] : []),
]

export const viewOptionsItems = (setView) => [
  menuItem('Grid', () => setView(FILE_VIEWS.GRID)),
  menuItem('List', () => setView(FILE_VIEWS.LIST)),
  SEPARATOR,
  disabledItem('Sort by Name'),
  disabledItem('Show Hidden Files'),
]

export const mainMenuItems = (newWindow) => [
  menuItem('New Window', newWindow),
  SEPARATOR,
  disabledItem('Preferences'),
  disabledItem('Keyboard Shortcuts'),
  disabledItem('Help'),
  disabledItem('About Files'),
]
