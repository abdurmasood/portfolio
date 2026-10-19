// The desktop's context menus (mockup wording)
import { SEPARATOR, disabledItem, menuItem } from '@/components/rafeyos/ui/menus/logic/menuItems'

/**
 * Right-click on a file or folder, on the desktop or in Files (only the desktop offers "Show in Files").
 * commands.openInProjects, when present, adds "Open in Projects" (project .txt files in Files).
 */
export const fileMenuItems = ({ commands, isFolder, onDesktop }) => [
  menuItem('Open', commands.open),
  ...(commands.openInProjects ? [menuItem('Open in Projects', commands.openInProjects)] : []),
  disabledItem('Open With…'),
  SEPARATOR,
  disabledItem('Cut'),
  disabledItem('Copy'),
  disabledItem('Rename…'),
  commands.restore ? menuItem('Restore', commands.restore) : menuItem('Move to Trash', commands.trash),
  SEPARATOR,
  ...(isFolder ? [menuItem('Open in Terminal', commands.openTerminal)] : []),
  ...(onDesktop ? [menuItem('Show in Files', commands.showInFiles)] : []),
  menuItem('Properties', commands.properties),
  ...(commands.emptyTrash !== undefined ? [SEPARATOR, menuItem('Empty Trash', commands.emptyTrash)] : []),
]

/** Right-click on the wallpaper. changeBackground and iconSettings open their Settings pages. */
export const wallMenuItems = ({ selectAll, showDesktop, openTerminal, changeBackground, iconSettings }) => [
  disabledItem('New Folder…'),
  disabledItem('Paste'),
  menuItem('Select All', selectAll),
  SEPARATOR,
  menuItem('Show Desktop in Files', showDesktop),
  menuItem('Open in Terminal', openTerminal),
  SEPARATOR,
  menuItem('Change Background…', changeBackground),
  menuItem('Desktop Icons Settings', iconSettings),
  disabledItem('Display Settings'),
]

const quitLabel = (count) => (count > 1 ? `Quit ${count} Windows` : 'Quit')

/**
 * Right-click on a dock icon: its windows, New Window, App Details, and Quit while it runs.
 * @param {{ windows: object[], show: (win) => void, newWindow: Function, quit: Function }} options
 */
export const dockMenuItems = ({ windows, show, newWindow, quit }) => [
  ...windows.map((win) => menuItem(win.title, () => show(win))),
  ...(windows.length ? [SEPARATOR] : []),
  menuItem('New Window', newWindow),
  SEPARATOR,
  disabledItem('App Details'),
  ...(windows.length ? [menuItem(quitLabel(windows.length), quit)] : []),
]

// Where the dock menu opens: beside a side dock, above a bottom one (mockup offsets)
const SIDE_GAP = 8
const RIGHT_DOCK_OFFSET = 200
const BOTTOM_GAP = 10

/** @returns {{ point: {x, y}, anchorBottom: boolean }} */
export const dockMenuPlacement = (buttonRect, dockPos) => {
  if (dockPos === 'bottom') return { point: { x: buttonRect.x, y: buttonRect.y - BOTTOM_GAP }, anchorBottom: true }
  const x = dockPos === 'left' ? buttonRect.x + buttonRect.w + SIDE_GAP : buttonRect.x - RIGHT_DOCK_OFFSET
  return { point: { x, y: buttonRect.y }, anchorBottom: false }
}
