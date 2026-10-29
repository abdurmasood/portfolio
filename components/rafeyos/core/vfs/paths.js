import { HOME, ROOT, TRASH } from './buildVfs'

export const parentOf = (path) => {
  if (path === ROOT) return null
  const slash = path.lastIndexOf('/')
  if (slash < 0) return null
  return slash === 0 ? ROOT : path.slice(0, slash)
}

/** "/" + "etc" -> "/etc"; "/home" + "rafey" -> "/home/rafey". */
export const joinPath = (dir, name) => (dir === ROOT ? `${ROOT}${name}` : `${dir}/${name}`)

/** Follows one symlink hop (the vfs never chains them). */
export const realPath = (vfs, path) => {
  const node = vfs[path]
  return node?.type === 'symlink' ? node.target : path
}

// The segments an argument names, or null for "~name" (no other users' homes by that spelling)
const segmentsFor = (arg, cwd) => {
  if (arg.startsWith('~/')) return [...HOME.split('/'), ...arg.slice(2).split('/')]
  if (arg.startsWith('~')) return null
  if (arg.startsWith('/')) return arg.split('/')
  return [...cwd.split('/'), ...arg.split('/')]
}

// `..` never climbs above /
const normalise = (segments) =>
  segments.reduce((out, segment) => {
    if (!segment || segment === '.') return out
    if (segment === '..') return out.slice(0, -1)
    return [...out, segment]
  }, [])

/**
 * Resolves a shell argument to a vfs path, or null when it doesn't exist.
 * "" and "~" are the visitor's home. Inside Trash (a place outside the tree) paths stay relative.
 * Symlinks are not followed: use realPath on the result.
 */
export const resolvePath = (vfs, arg, cwd) => {
  if (!arg || arg === '~') return HOME
  const segments = segmentsFor(arg, cwd)
  if (!segments) return null
  // Trash is its own root, so `..` stops there rather than leaving it
  const path = segments[0] === TRASH ? [TRASH, ...normalise(segments.slice(1))].join('/') : ROOT + normalise(segments).join('/')
  return vfs[path] ? path : null
}

/** Shell-style path for display: the visitor's home folds into ~. */
export const tilde = (path) => {
  if (path === HOME) return '~'
  return path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path
}

export const absPath = (path) => (path === TRASH ? 'trash:///' : path)
