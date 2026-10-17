import { HOME, TRASH } from './buildVfs'

const HOME_ABSOLUTE = '/home/visitor'

export const parentOf = (path) => {
  const slash = path.lastIndexOf('/')
  return slash < 0 ? null : path.slice(0, slash)
}

/** Follows one symlink hop (the vfs never chains them). */
export const realPath = (vfs, path) => {
  const node = vfs[path]
  return node?.type === 'symlink' ? node.target : path
}

const toHomeRelative = (arg) => {
  if (arg === HOME_ABSOLUTE || arg.startsWith(`${HOME_ABSOLUTE}/`)) return HOME + arg.slice(HOME_ABSOLUTE.length)
  return arg
}

const segmentsFor = (arg, cwd) => {
  if (arg === HOME || arg.startsWith(`${HOME}/`)) return [HOME, ...arg.slice(2).split('/')]
  if (arg.startsWith('/')) return null
  return [...cwd.split('/'), ...arg.split('/')]
}

// `..` never climbs above ~: the first segment is the root
const normalise = (segments) =>
  segments.reduce((out, segment) => {
    if (!segment || segment === '.') return out
    if (segment === '..') return out.length > 1 ? out.slice(0, -1) : out
    return [...out, segment]
  }, [])

/**
 * Resolves a shell argument to a vfs path, or null when it doesn't exist.
 * Symlinks are not followed: use realPath on the result.
 */
export const resolvePath = (vfs, arg, cwd) => {
  if (!arg || arg === HOME) return HOME
  const segments = segmentsFor(toHomeRelative(arg), cwd)
  if (!segments) return null
  const path = normalise(segments).join('/') || HOME
  return vfs[path] ? path : null
}

/** Shell-style path for display: internal paths are already ~-relative. */
export const tilde = (path) => toHomeRelative(path)

export const absPath = (path) => (path === TRASH ? 'trash:///' : HOME_ABSOLUTE + path.slice(1))
