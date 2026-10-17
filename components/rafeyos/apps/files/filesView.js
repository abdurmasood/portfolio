// What a Files window shows for its reducer state. Pure, so the components stay thin.
import { HOME, TRASH } from '../../vfs/buildVfs'
import { children, displayName, isDir, kindOf, search, sizeLabel } from '../../vfs/queries'

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
  { path: '~/Desktop', label: 'Desktop', icon: 'desktop' },
  { path: '~/Music', label: 'Music', icon: 'music' },
  null,
  { path: '~/projects', label: 'projects', icon: 'folder' },
  { path: '~/blog', label: 'blog', icon: 'folder' },
  { path: '~/contact', label: 'contact', icon: 'folder' },
  null,
  { path: TRASH, label: 'Trash', icon: 'trash' },
])

export const locationLabel = (vfs, path) => PLACES[path]?.label ?? displayName(vfs, path)

export const windowTitle = (vfs, { path, search: query }) => (query === null ? locationLabel(vfs, path) : 'Search')

/** Recent stays empty until files can be opened (P2); nothing can be starred yet. */
export const listItems = (vfs, { path, search: query }) => {
  if (query !== null) return search(vfs, query)
  if (path === RECENT || path === STARRED) return []
  return children(vfs, path)
}

/** @returns {{ icon: string, title: string, body: string }} */
export const emptyState = ({ path, search: query }) => {
  if (query !== null) return { icon: 'search', title: 'No Results Found', body: 'Try a different search.' }
  if (path === TRASH) return { icon: 'trash', title: 'Trash is Empty', body: '' }
  if (path === STARRED) return { icon: 'star', title: 'No Starred Files', body: 'Star files from their right-click menu.' }
  if (path === RECENT) return { icon: 'recent', title: 'No Recent Files', body: '' }
  return { icon: 'folder', title: 'Folder is Empty', body: '' }
}

/** "~/projects" -> ["~", "~/projects"]: one pathbar button per ancestor. */
export const pathSegments = (path) => {
  const parts = path.split('/')
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'))
}

export const floatbarText = (vfs, selection) => {
  if (!selection.length) return null
  if (selection.length > 1) return `${selection.length} items selected`
  const [path] = selection
  return `“${displayName(vfs, path)}” selected (${sizeLabel(vfs, path)})`
}

/** List view's Type column. */
export const typeLabel = (vfs, path) => (isDir(vfs, path) ? 'Folder' : kindOf(vfs, path).replace(' document', ''))
