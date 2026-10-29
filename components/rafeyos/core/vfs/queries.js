import { HOME, RAFEY_HOME } from './buildVfs'
import { parentOf, realPath } from './paths'
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

export const displayName = (vfs, path) => (path === HOME ? 'Home' : vfs[path].display || vfs[path].name)

const byDirThenName = (vfs) => (a, b) =>
  Number(isDir(vfs, b)) - Number(isDir(vfs, a)) ||
  vfs[a].name.localeCompare(vfs[b].name, undefined, { sensitivity: 'base' })

/** Direct children, folders (and links to folders) first, then by name ignoring case. */
export const children = (vfs, path) =>
  Object.keys(vfs)
    .filter((key) => key !== path && parentOf(key) === path)
    .sort(byDirThenName(vfs))

export const sizeOf = (vfs, path) => {
  const node = vfs[realPath(vfs, path)]
  return node.type === 'audio' ? node.sizeBytes : encoder.encode(node.text || '').length
}

export const sizeLabel = (vfs, path) => {
  if (!isDir(vfs, path)) return humanBytes(sizeOf(vfs, path))
  const count = children(vfs, realPath(vfs, path)).length
  return `${count} item${count === 1 ? '' : 's'}`
}

export const kindOf = (vfs, path) => {
  const node = vfs[path]
  if (node.type === 'symlink') return `Link to ${KIND[vfs[node.target].type].toLowerCase()}`
  if (path.endsWith('.md')) return 'Markdown document'
  return KIND[node.type]
}

// Strictly inside one of the two homes: system files, the homes themselves and trash stay out
const inHomes = (path) => path.startsWith(`${HOME}/`) || path.startsWith(`${RAFEY_HOME}/`)

/** Case-insensitive name search across both homes; skips links. */
export const search = (vfs, query) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return Object.keys(vfs).filter(
    (path) => inHomes(path) && vfs[path].type !== 'symlink' && displayName(vfs, path).toLowerCase().includes(needle),
  )
}

/** Every live text file in both homes, in vfs order: the editor's "Recent Documents". Trash stays out. */
export const textDocuments = (vfs) => Object.keys(vfs).filter((path) => inHomes(path) && vfs[path].type === 'text')
