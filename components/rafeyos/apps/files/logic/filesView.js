// What a Files window shows for its reducer state. Pure, so the components stay thin.
import { HOME, RAFEY_HOME, ROOT, TRASH } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath } from '@/components/rafeyos/core/vfs/paths'
import { children, displayName, isDir, isHidden, kindOf, search, sizeLabel } from '@/components/rafeyos/core/vfs/queries'

export const RECENT = 'recent'
export const STARRED = 'starred'

// Places that aren't folders in the vfs: shown as a single pathbar button with their icon
export const PLACES = Object.freeze({
  [RECENT]: Object.freeze({ label: 'Recent', icon: 'recent' }),
  [STARRED]: Object.freeze({ label: 'Starred', icon: 'star' }),
  [TRASH]: Object.freeze({ label: 'Trash', icon: 'trash' }),
})

export const SIDEBAR = Object.freeze([
  { path: RECENT, label: 'Recent', icon: 'recent' },
  { path: STARRED, label: 'Starred', icon: 'star' },
  { path: HOME, label: 'Home', icon: 'home' },
  { path: joinPath(HOME, 'Desktop'), label: 'Desktop', icon: 'desktop' },
  { path: joinPath(HOME, 'Documents'), label: 'Documents', icon: 'folder' },
  { path: joinPath(RAFEY_HOME, 'Music'), label: 'Music', icon: 'music' },
  null,
  { path: joinPath(RAFEY_HOME, 'projects'), label: 'projects', icon: 'folder' },
  { path: joinPath(RAFEY_HOME, 'blog'), label: 'blog', icon: 'folder' },
  { path: joinPath(RAFEY_HOME, 'contact'), label: 'contact', icon: 'folder' },
  null,
  { path: TRASH, label: 'Trash', icon: 'trash' },
])

export const locationLabel = (vfs, path) => PLACES[path]?.label ?? displayName(vfs, path)

export const windowTitle = (vfs, { path, search: query }) => (query === null ? locationLabel(vfs, path) : 'Search')

/** Recent stays empty until files can be opened (P2); nothing can be starred yet. Dotfiles stay hidden. */
export const listItems = (vfs, { path, search: query }) => {
  if (query !== null) return search(vfs, query)
  if (path === RECENT || path === STARRED) return []
  return children(vfs, path).filter((child) => !isHidden(child))
}

/** @returns {{ icon: string, title: string, body: string }} */
export const emptyState = ({ path, search: query }) => {
  if (query !== null) return { icon: 'search', title: 'No Results Found', body: 'Try a different search.' }
  if (path === TRASH) return { icon: 'trash', title: 'Trash is Empty', body: '' }
  if (path === STARRED) return { icon: 'star', title: 'No Starred Files', body: 'Star files from their right-click menu.' }
  if (path === RECENT) return { icon: 'recent', title: 'No Recent Files', body: '' }
  return { icon: 'folder', title: 'Folder is Empty', body: '' }
}

const isUnderHome = (path) => path === HOME || path.startsWith(`${HOME}/`)

/**
 * One pathbar button per ancestor. Inside the visitor's home the bar starts at Home, as it
 * always has; anywhere else it starts at the root:
 * "/home/visitor/Desktop" -> [HOME, HOME/Desktop]; "/home/rafey" -> ["/", "/home", "/home/rafey"].
 */
export const pathSegments = (path) => {
  const start = isUnderHome(path) ? HOME : ROOT
  const names = path.slice(start.length).split('/').filter(Boolean)
  return names.reduce((segments, name) => [...segments, joinPath(segments[segments.length - 1], name)], [start])
}

export const floatbarText = (vfs, selection) => {
  const present = selection.filter((path) => vfs[path])
  if (!present.length) return null
  if (present.length > 1) return `${present.length} items selected`
  const [path] = present
  return `“${displayName(vfs, path)}” selected (${sizeLabel(vfs, path)})`
}

/** List view's Type column. */
export const typeLabel = (vfs, path) => (isDir(vfs, path) ? 'Folder' : kindOf(vfs, path).replace(' document', ''))
