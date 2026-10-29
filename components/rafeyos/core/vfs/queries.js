import { BIN, HOME, RAFEY_HOME, TMP, USR_BIN } from './buildVfs'
import { parentOf, realPath, resolve } from './paths'
import { humanBytes } from './format'

const KIND = Object.freeze({
  dir: 'Folder',
  text: 'Plain text document',
  audio: 'MP3 audio',
  mailto: 'Link to email',
  weblink: 'Link to website',
  symlink: 'Link',
})

const encoder = new TextEncoder()

export const isDir = (vfs, path) => vfs[realPath(vfs, path)]?.type === 'dir'

const lastSegment = (path) => path.slice(path.lastIndexOf('/') + 1)

/** A path that no longer exists (the shell removed it) still names itself, by its last segment. */
export const displayName = (vfs, path) => {
  if (path === HOME) return 'Home'
  const node = vfs[path]
  return node ? node.display || node.name : lastSegment(path)
}

const byDirThenName = (vfs) => (a, b) =>
  Number(isDir(vfs, b)) - Number(isDir(vfs, a)) ||
  vfs[a].name.localeCompare(vfs[b].name, undefined, { sensitivity: 'base' })

/** Direct children, folders (and links to folders) first, then by name ignoring case. */
export const children = (vfs, path) =>
  Object.keys(vfs)
    .filter((key) => key !== path && parentOf(key) === path)
    .sort(byDirThenName(vfs))

/** Bytes a file holds; 0 for a path that is gone and for a link that leads nowhere. */
export const sizeOf = (vfs, path) => {
  const node = vfs[realPath(vfs, path)]
  if (!node || node.type === 'symlink') return 0
  return node.type === 'audio' ? node.sizeBytes : encoder.encode(node.text || '').length
}

/** A file's bytes, or a folder's item count; dotfiles aren't counted, as Files doesn't show them. */
export const sizeLabel = (vfs, path) => {
  if (!isDir(vfs, path)) return humanBytes(sizeOf(vfs, path))
  const count = children(vfs, realPath(vfs, path)).filter((child) => !isHidden(child)).length
  return `${count} item${count === 1 ? '' : 's'}`
}

const UNKNOWN_KIND = 'Unknown'
const BROKEN_LINK_KIND = 'Link (broken)'

/** "Unknown" for a path that is gone; a link names what it reaches, or is broken when that is gone. */
export const kindOf = (vfs, path) => {
  const node = vfs[path]
  if (!node) return UNKNOWN_KIND
  if (node.type === 'symlink') {
    const reached = resolve(vfs, path, { followLast: true })
    return reached.ok ? `Link to ${KIND[vfs[reached.path].type].toLowerCase()}` : BROKEN_LINK_KIND
  }
  if (path.endsWith('.md')) return 'Markdown document'
  return KIND[node.type]
}

/** A dotfile: hidden in Files, on the desktop, in search and in Editor → Open, as Ubuntu hides them by default. */
export const isHidden = (path) => path.slice(path.lastIndexOf('/') + 1).startsWith('.')

// Anywhere below a dot folder counts too: the GUI never indexes what it doesn't show
const isOrInHidden = (path) => path.split('/').some((segment) => segment.startsWith('.'))

// Strictly inside one of the two homes and not hidden: system files, the homes themselves, trash and dotfiles stay out
const inHomes = (path) => (path.startsWith(`${HOME}/`) || path.startsWith(`${RAFEY_HOME}/`)) && !isOrInHidden(path)

/** Case-insensitive name search across both homes; skips links and dotfiles. */
export const search = (vfs, query) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return Object.keys(vfs).filter(
    (path) => inHomes(path) && vfs[path].type !== 'symlink' && displayName(vfs, path).toLowerCase().includes(needle),
  )
}

/** Every live text file in both homes, in vfs order: the editor's "Recent Documents". Trash and dotfiles stay out. */
export const textDocuments = (vfs) => Object.keys(vfs).filter((path) => inHomes(path) && vfs[path].type === 'text')

const DIR_SIZE = 4096
const MODE = Object.freeze({ dir: 'drwxr-xr-x', file: '-rw-r--r--', symlink: 'lrwxrwxrwx', stub: '-rwxr-xr-x', sticky: 'drwxrwxrwt' })

const isAtOrUnder = (path, root) => path === root || path.startsWith(`${root}/`)

// The visitor owns their home and whatever they put in /tmp; Rafey owns his home and his commands; root the rest
const ownerOf = (path) => {
  if (isAtOrUnder(path, HOME) || path.startsWith(`${TMP}/`)) return 'visitor'
  if (isAtOrUnder(path, RAFEY_HOME) || isAtOrUnder(path, BIN)) return 'rafey'
  return 'root'
}

const modeOf = (path, node) => {
  if (path === TMP) return MODE.sticky
  if (node.type === 'dir') return MODE.dir
  if (node.type === 'symlink') return MODE.symlink
  const parent = parentOf(path)
  return parent === BIN || parent === USR_BIN ? MODE.stub : MODE.file
}

// A folder's links: its name in its parent, its own "." and each subfolder's ".."
const linkCount = (vfs, path) =>
  2 + Object.keys(vfs).filter((key) => key !== path && parentOf(key) === path && vfs[key].type === 'dir').length

// The facts for a real path: one whose links on the way are already followed
const factsAt = (vfs, path) => {
  const node = vfs[path]
  const owner = ownerOf(path)
  const facts = { type: node.type, mode: modeOf(path, node), owner, group: owner, mtime: node.mtime }
  if (node.type === 'dir') return { ...facts, size: DIR_SIZE, nlink: linkCount(vfs, path) }
  if (node.type === 'symlink') return { ...facts, size: encoder.encode(node.target).length, nlink: 1, target: node.target }
  return { ...facts, size: sizeOf(vfs, path), nlink: 1 }
}

/**
 * What `ls -l` and `stat` print for a path, following links on the way but not one at the end of it, or null when
 * nothing is there. A link's size is its target's length, as on Linux.
 * @returns {{ type: string, mode: string, owner: string, group: string, size: number, mtime: number, nlink: number, target?: string } | null}
 */
export const statOf = (vfs, path) => {
  const spot = resolve(vfs, path)
  return spot.ok ? factsAt(vfs, spot.path) : null
}
