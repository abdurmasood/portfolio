import { HOME, ROOT, TRASH } from './buildVfs'

export const parentOf = (path) => {
  if (path === ROOT) return null
  const slash = path.lastIndexOf('/')
  if (slash < 0) return null
  return slash === 0 ? ROOT : path.slice(0, slash)
}

/** "/" + "etc" -> "/etc"; "/home" + "rafey" -> "/home/rafey". */
export const joinPath = (dir, name) => (dir === ROOT ? `${ROOT}${name}` : `${dir}/${name}`)

/** Linux's MAXSYMLINKS: one more hop than this is a loop. */
export const MAX_HOPS = 40

const located = (path) => ({ ok: true, path })
const failed = (errno) => ({ ok: false, errno })

// "." and empty segments name the folder already reached
const segmentsOf = (path) => path.split('/').filter((segment) => segment && segment !== '.')

/**
 * Where an absolute path really is: symlinks are followed in every segment, and in the last one only with `followLast`.
 * A relative link target resolves against the link's own folder, and `..` climbs from wherever a link led.
 * A path outside the tree (Trash) is taken as it is.
 * @param {Readonly<Record<string, { type: string, target?: string }>>} vfs
 * @param {string} path
 * @param {{ followLast?: boolean }} [options]
 * @returns {{ ok: true, path: string } | { ok: false, errno: 'ENOENT' | 'ENOTDIR' | 'ELOOP' }}
 */
export const resolve = (vfs, path, { followLast = false } = {}) => {
  if (!path.startsWith(ROOT)) return vfs[path] ? located(path) : failed('ENOENT')
  let pending = segmentsOf(path)
  let current = ROOT
  let hops = 0
  while (pending.length) {
    const [segment, ...rest] = pending
    pending = rest
    if (segment === '..') {
      current = parentOf(current) ?? ROOT
      continue
    }
    const next = joinPath(current, segment)
    const node = vfs[next]
    if (!node) return failed('ENOENT')
    if (node.type === 'symlink' && (pending.length || followLast)) {
      hops += 1
      if (hops > MAX_HOPS) return failed('ELOOP')
      if (node.target.startsWith(ROOT)) current = ROOT
      pending = [...segmentsOf(node.target), ...pending]
      continue
    }
    if (pending.length && node.type !== 'dir') return failed('ENOTDIR')
    current = next
  }
  return located(current)
}

/** Follows every symlink on the way to `path`; a path that doesn't resolve stays as it is. */
export const realPath = (vfs, path) => {
  const resolved = resolve(vfs, path, { followLast: true })
  return resolved.ok ? resolved.path : path
}

const absoluteSegments = (arg, cwd) => (arg.startsWith('/') ? arg.split('/') : [...cwd.split('/'), ...arg.split('/')])

// The segments an argument names, or null for "~name" (no other users' homes by that spelling)
const segmentsFor = (arg, cwd) => {
  if (arg.startsWith('~/')) return [...HOME.split('/'), ...arg.slice(2).split('/')]
  if (arg.startsWith('~')) return null
  return absoluteSegments(arg, cwd)
}

// `..` never climbs above /
const normalise = (segments) =>
  segments.reduce((out, segment) => {
    if (!segment || segment === '.') return out
    if (segment === '..') return out.slice(0, -1)
    return [...out, segment]
  }, [])

// Trash is its own root, so `..` stops there rather than leaving it
const joinSegments = (segments) =>
  segments[0] === TRASH ? [TRASH, ...normalise(segments.slice(1))].join('/') : ROOT + normalise(segments).join('/')

/**
 * The absolute path an argument names, whether or not it exists: what a command creates or redirects into.
 * Lexical only, so `..` after a link climbs the path as typed; `~` is the shell's to expand, so here it is a name.
 */
export const normalize = (arg, cwd) => joinSegments(absoluteSegments(arg, cwd))

/**
 * Resolves a shell argument to a vfs path, or null when it doesn't exist.
 * "" and "~" are the visitor's home. Inside Trash (a place outside the tree) paths stay relative.
 * Symlinks are not followed: use realPath on the result.
 */
export const resolvePath = (vfs, arg, cwd) => {
  if (!arg || arg === '~') return HOME
  const segments = segmentsFor(arg, cwd)
  if (!segments) return null
  const path = joinSegments(segments)
  return vfs[path] ? path : null
}

/** Shell-style path for display: the visitor's home folds into ~. */
export const tilde = (path) => {
  if (path === HOME) return '~'
  return path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path
}

export const absPath = (path) => (path === TRASH ? 'trash:///' : path)
