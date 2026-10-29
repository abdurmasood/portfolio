// @ts-check
// The shell's filesystem calls as pure functions over the visitor's state. Each takes the merged tree (to read shipped
// nodes and follow links), the state it changes, its arguments and the time, and answers the way a syscall does: a new
// state, or an errno. Only HOME, TMP and the visitor's own folders inside them can change; everything else is EACCES.
// Every `path` argument is absolute and normalised (paths.normalize); an error names it as the caller spelled it.
import { HOME, NODE_TYPES, TMP } from './buildVfs'
import { COPY, MAX_NAME, copyNode, dirNode, symlinkNode, textNode, withFile, withNodes, without } from './fsState'
import { MAX_HOPS, joinPath, parentOf, resolve } from './paths'

/** @import { Vfs, VfsNode } from './buildVfs' */
/** @import { FsNode, FsState } from './fsState' */

/**
 * @typedef {'EACCES' | 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'ENOTEMPTY' | 'EINVAL' | 'ENAMETOOLONG' | 'EPERM' | 'ELOOP'} Errno
 * @typedef {{ errno: Errno, path: string }} FsOpError
 * @typedef {{ ok: true, state: FsState, errors?: FsOpError[] } | { ok: false, errno: Errno, path: string }} FsOpResult
 * @typedef {{ ok: true, parent: string, path: string, node: VfsNode | undefined }} Spot where a path lands: its real
 *   parent folder, its real path, and the node there (a link at the last name is not followed)
 * @typedef {Spot | { ok: false, errno: Errno }} Located
 */

/** @param {Errno} errno @param {string} path @returns {FsOpResult} */
const fail = (errno, path) => ({ ok: false, errno, path })

/** @param {FsState} state @param {FsOpError[]} [errors] @returns {FsOpResult} */
const done = (state, errors = []) => (errors.length ? { ok: true, state, errors } : { ok: true, state })

/** @param {string} path */
const nameOf = (path) => path.slice(path.lastIndexOf('/') + 1)

/** @param {VfsNode | undefined} node */
const isDirNode = (node) => node?.type === NODE_TYPES.DIR

/**
 * HOME, TMP, or one of the visitor's own folders.
 * @param {FsState} state
 * @param {string | null} folder
 */
const isWritableDir = (state, folder) =>
  folder === HOME || folder === TMP || (folder !== null && state.nodes[folder]?.type === NODE_TYPES.DIR)

/**
 * The visitor's own node in a folder they can change.
 * @param {FsState} state
 * @param {string} path a real path
 */
const canRemove = (state, path) => isWritableDir(state, parentOf(path)) && Object.hasOwn(state.nodes, path)

/** @param {Vfs} vfs @param {string} folder */
const childrenOf = (vfs, folder) => Object.keys(vfs).filter((path) => parentOf(path) === folder)

/** @param {Vfs} vfs @param {string} folder */
const hasChildren = (vfs, folder) => Object.keys(vfs).some((path) => parentOf(path) === folder)

/**
 * @param {Vfs} vfs
 * @param {string} path
 * @returns {Located}
 */
const locate = (vfs, path) => {
  const parent = parentOf(path)
  // The root is its own parent, and no one can change it
  if (parent === null) return { ok: true, parent: path, path, node: vfs[path] }
  const folder = resolve(vfs, parent, { followLast: true })
  if (!folder.ok) return folder
  if (!isDirNode(vfs[folder.path])) return { ok: false, errno: 'ENOTDIR' }
  const real = joinPath(folder.path, nameOf(path))
  return { ok: true, parent: folder.path, path: real, node: vfs[real] }
}

/**
 * Where a link's target lands. Its folder is found the way resolve finds it, so a `..` after a linked folder climbs
 * from where that link led, not up the target as written; a target that names a folder (`d/..`) resolves whole.
 * @param {Vfs} vfs
 * @param {string} target as the link holds it
 * @param {string} folder the link's real folder
 * @returns {Located}
 */
const targetSpot = (vfs, target, folder) => {
  const raw = target.startsWith('/') ? target : joinPath(folder, target)
  const name = nameOf(raw)
  if (name && name !== '.' && name !== '..') return locate(vfs, raw)
  const whole = resolve(vfs, raw, { followLast: true })
  return whole.ok ? locate(vfs, whole.path) : whole
}

/**
 * Where a write lands: a link at the last name is followed, a dangling one to the file it would create.
 * @param {Vfs} vfs
 * @param {string} path
 * @returns {Located}
 */
const writeSpot = (vfs, path) => {
  let spot = locate(vfs, path)
  for (let hops = 0; spot.ok && spot.node?.type === NODE_TYPES.SYMLINK; hops += 1) {
    if (hops === MAX_HOPS) return { ok: false, errno: 'ELOOP' }
    spot = targetSpot(vfs, spot.node.target, spot.parent)
  }
  return spot
}

/**
 * Why a file can't be created or changed at `spot`, or null when it can.
 * @param {FsState} state
 * @param {Spot} spot
 * @param {string} path as the caller spelled it
 */
const cannotWrite = (state, spot, path) => {
  if (nameOf(spot.path).length > MAX_NAME) return fail('ENAMETOOLONG', path)
  if (!isWritableDir(state, spot.parent)) return fail('EACCES', path)
  if (spot.node && !Object.hasOwn(state.nodes, spot.path)) return fail('EACCES', path)
  return null
}

/**
 * One folder whose parent already exists. Returns where it was made, so mkdir -p can keep walking.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {string} path
 * @param {number} now
 * @returns {{ ok: true, state: FsState, path: string } | { ok: false, errno: Errno, path: string }}
 */
const makeDir = (vfs, state, path, now) => {
  const spot = locate(vfs, path)
  if (!spot.ok) return { ok: false, errno: spot.errno, path }
  if (spot.node) return { ok: false, errno: 'EEXIST', path }
  const refused = cannotWrite(state, spot, path)
  if (refused) return /** @type {{ ok: false, errno: Errno, path: string }} */ (refused)
  return { ok: true, state: withNodes(state, { ...state.nodes, [spot.path]: dirNode(now) }), path: spot.path }
}

/**
 * mkdir, and with `parents` mkdir -p: every missing folder on the way, through links, and no error for one that exists.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ path: string, parents?: boolean }} args
 * @param {number} now
 * @returns {FsOpResult}
 */
export const mkdir = (vfs, state, { path, parents = false }, now) => {
  if (!parents) {
    const made = makeDir(vfs, state, path, now)
    return made.ok ? done(made.state) : made
  }
  const segments = path.split('/').filter(Boolean)
  const prefixes = segments.map((_, index) => `/${segments.slice(0, index + 1).join('/')}`)
  let tree = vfs
  let current = state
  for (const prefix of prefixes) {
    const existing = resolve(tree, prefix, { followLast: true })
    // A file on the way is reported by the next folder's lookup; one at the end is EEXIST
    if (existing.ok && (isDirNode(tree[existing.path]) || prefix !== path)) continue
    const made = makeDir(tree, current, prefix, now)
    if (!made.ok) return made
    current = made.state
    tree = { ...tree, [made.path]: Object.freeze({ path: made.path, name: nameOf(made.path), type: NODE_TYPES.DIR, mtime: now }) }
  }
  return done(current)
}

/**
 * Writes `text` to a file, creating it, or with `append` adds to it. `truncateOnly` empties it (or creates it empty),
 * as a `>` redirect does before its command runs. A link at the last name is written through.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ path: string, text?: string, append?: boolean, truncateOnly?: boolean }} args
 * @param {number} now
 * @returns {FsOpResult}
 */
export const writeFile = (vfs, state, { path, text = '', append = false, truncateOnly = false }, now) => {
  const spot = writeSpot(vfs, path)
  if (!spot.ok) return fail(spot.errno, path)
  if (isDirNode(spot.node)) return fail('EISDIR', path)
  const refused = cannotWrite(state, spot, path)
  if (refused) return refused
  const before = append && spot.node && 'text' in spot.node ? spot.node.text : ''
  const nodes = /** @type {Record<string, FsNode>} */ (withFile(state.nodes, spot.path, truncateOnly ? '' : before + text, now))
  return done(withNodes(state, nodes))
}

/**
 * Creates an empty file, or stamps an existing one (through a link) with `now`.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ path: string }} args
 * @param {number} now
 * @returns {FsOpResult}
 */
export const touch = (vfs, state, { path }, now) => {
  const spot = writeSpot(vfs, path)
  if (!spot.ok) return fail(spot.errno, path)
  // Both are the visitor's to touch, but their dates are shipped: nothing to change
  if (spot.path === HOME || spot.path === TMP) return done(state)
  const refused = cannotWrite(state, spot, path)
  if (refused) return refused
  const node = state.nodes[spot.path]
  return done(withNodes(state, { ...state.nodes, [spot.path]: node ? Object.freeze({ ...node, mtime: now }) : textNode('', now) }))
}

/**
 * Deletes a folder and everything in it the visitor owns. A folder that kept something stays without a word of its
 * own, so `rm -rf ~` empties the home and reports only the home itself.
 * @param {{ vfs: Vfs, real: string, shown: string }} where `shown` is how the caller spells the top folder
 * @param {FsState} state
 * @param {string} path a real path inside (or equal to) `where.real`
 * @returns {{ state: FsState, errors: FsOpError[] }}
 */
const removeTree = (where, state, path) => {
  let current = state
  /** @type {FsOpError[]} */
  const errors = []
  if (isDirNode(where.vfs[path])) {
    childrenOf(where.vfs, path).forEach((child) => {
      const removed = removeTree(where, current, child)
      current = removed.state
      errors.push(...removed.errors)
    })
    if (errors.length) return { state: current, errors }
  }
  if (!canRemove(current, path)) return { state: current, errors: [{ errno: 'EACCES', path: where.shown + path.slice(where.real.length) }] }
  return { state: withNodes(current, without(current.nodes, path)), errors: [] }
}

/**
 * rm, rm -r and rmdir (`dirOnly`: only an empty folder). A link is removed, never what it points at.
 * A recursive delete that leaves something behind is still ok, with what it couldn't remove in `errors`.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ path: string, recursive?: boolean, dirOnly?: boolean }} args
 * @returns {FsOpResult}
 */
export const remove = (vfs, state, { path, recursive = false, dirOnly = false }) => {
  const spot = locate(vfs, path)
  if (!spot.ok) return fail(spot.errno, path)
  if (!spot.node) return fail('ENOENT', path)
  const isDir = isDirNode(spot.node)
  if (dirOnly && !isDir) return fail('ENOTDIR', path)
  if (isDir && recursive) {
    const removed = removeTree({ vfs, real: spot.path, shown: path }, state, spot.path)
    return done(removed.state, removed.errors)
  }
  if (isDir && !dirOnly) return fail('EISDIR', path)
  if (!canRemove(state, spot.path)) return fail('EACCES', path)
  if (dirOnly && hasChildren(vfs, spot.path)) return fail('ENOTEMPTY', path)
  return done(withNodes(state, without(state.nodes, spot.path)))
}

/**
 * Why `source` can't be placed at `dest` as rename(2) would, or null when it can.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ source: { path: string, node: VfsNode }, dest: Spot }} spots
 * @param {string} to as the caller spelled it
 */
const placeRefusal = (vfs, state, { source, dest }, to) => {
  if (nameOf(dest.path).length > MAX_NAME) return fail('ENAMETOOLONG', to)
  if (!isWritableDir(state, dest.parent)) return fail('EACCES', to)
  const fromDir = isDirNode(source.node)
  if (fromDir && dest.path.startsWith(`${source.path}/`)) return fail('EINVAL', to)
  if (!dest.node) return null
  const toDir = isDirNode(dest.node)
  if (toDir && !fromDir) return fail('EISDIR', to)
  if (fromDir && !toDir) return fail('ENOTDIR', to)
  return null
}

/**
 * `nodes` with `from` and everything under it re-keyed to `to`, dropping what `to` held.
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {string} from
 * @param {string} to
 */
const rekeyed = (nodes, from, to) =>
  Object.fromEntries(Object.entries(nodes).flatMap(([path, node]) => {
    if (path === to) return []
    if (path === from || path.startsWith(`${from}/`)) return [[to + path.slice(from.length), node]]
    return [[path, node]]
  }))

/**
 * mv's rename: the exact destination, replaced when it is a file or an empty folder. Moving into a folder is the
 * command's to work out. A shipped source stays where it is.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ from: string, to: string }} args
 * @returns {FsOpResult}
 */
export const move = (vfs, state, { from, to }) => {
  const source = locate(vfs, from)
  if (!source.ok) return fail(source.errno, from)
  if (!source.node) return fail('ENOENT', from)
  if (!canRemove(state, source.path)) return fail('EACCES', from)
  const dest = locate(vfs, to)
  if (!dest.ok) return fail(dest.errno, to)
  if (dest.path === source.path) return done(state)
  const refused = placeRefusal(vfs, state, { source: { path: source.path, node: source.node }, dest }, to)
  if (refused) return refused
  if (isDirNode(dest.node) && hasChildren(vfs, dest.path)) return fail('ENOTEMPTY', to)
  return done(withNodes(state, rekeyed(state.nodes, source.path, dest.path)))
}

/**
 * The visitor's copy of one file: text stays text, a link stays a link, and a shipped file that isn't text
 * (the song, the .desktop links) becomes a copy node pointing at it.
 * @param {FsState} state
 * @param {string} from a real path
 * @param {VfsNode} node the merged node at `from`
 * @param {number} now
 * @returns {FsNode}
 */
const fileCopy = (state, from, node, now) => {
  const own = state.nodes[from]
  if (own?.type === COPY) return copyNode(own.from, now)
  if (node.type === NODE_TYPES.TEXT) return textNode(node.text, now)
  if (node.type === NODE_TYPES.SYMLINK) return symlinkNode(node.target, now)
  return copyNode(from, now)
}

/**
 * Copies `from` to `to`, merging a folder into one that exists. A clash inside is skipped and reported.
 * @param {{ vfs: Vfs, state: FsState, now: number, errors: FsOpError[], real: string, shown: string }} job
 * @param {Record<string, FsNode>} nodes
 * @param {string} from
 * @param {string} to
 * @returns {Record<string, FsNode>}
 */
const copyInto = (job, nodes, from, to) => {
  const node = job.vfs[from]
  const existing = job.vfs[to]
  const clash = (/** @type {Errno} */ errno) => {
    job.errors.push({ errno, path: job.shown + to.slice(job.real.length) })
    return nodes
  }
  if (!isDirNode(node)) return isDirNode(existing) ? clash('EISDIR') : { ...nodes, [to]: fileCopy(job.state, from, node, job.now) }
  if (existing && !isDirNode(existing)) return clash('ENOTDIR')
  const start = existing ? nodes : { ...nodes, [to]: dirNode(job.now) }
  return childrenOf(job.vfs, from).reduce((acc, child) => copyInto(job, acc, child, to + child.slice(from.length)), start)
}

/**
 * The file (or with `recursive`, the folder) a copy reads: a link is followed unless copying recursively, as cp -r copies links as links.
 * @param {Vfs} vfs
 * @param {string} from
 * @param {boolean} recursive
 * @returns {{ ok: true, path: string, node: VfsNode } | { ok: false, errno: Errno }}
 */
const copySource = (vfs, from, recursive) => {
  if (recursive) {
    const spot = locate(vfs, from)
    if (!spot.ok) return spot
    return spot.node ? { ok: true, path: spot.path, node: spot.node } : { ok: false, errno: 'ENOENT' }
  }
  const real = resolve(vfs, from, { followLast: true })
  return real.ok ? { ok: true, path: real.path, node: vfs[real.path] } : real
}

/**
 * Where a copy lands. A file is written through a link there, as open(2) does, but never through a dangling one
 * (ENOENT), as GNU cp refuses to. A folder, or a link copied as a link, takes the destination's own name.
 * @param {Vfs} vfs
 * @param {string} to
 * @param {VfsNode} source the node being copied
 * @returns {Located}
 */
const copyDest = (vfs, to, source) => {
  const dest = locate(vfs, to)
  if (!dest.ok || dest.node?.type !== NODE_TYPES.SYMLINK || isDirNode(source) || source.type === NODE_TYPES.SYMLINK) return dest
  const reached = resolve(vfs, dest.path, { followLast: true })
  return reached.ok ? locate(vfs, reached.path) : reached
}

/**
 * cp to the exact destination, overwriting the visitor's file there. Copying into a folder is the command's to work out.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ from: string, to: string, recursive?: boolean }} args
 * @param {number} now
 * @returns {FsOpResult}
 */
export const copy = (vfs, state, { from, to, recursive = false }, now) => {
  const source = copySource(vfs, from, recursive)
  if (!source.ok) return fail(source.errno, from)
  if (isDirNode(source.node) && !recursive) return fail('EISDIR', from)
  const dest = copyDest(vfs, to, source.node)
  if (!dest.ok) return fail(dest.errno, to)
  if (dest.path === source.path) return fail('EINVAL', to)
  const refused = placeRefusal(vfs, state, { source, dest }, to)
  if (refused) return refused
  /** @type {FsOpError[]} */
  const errors = []
  const nodes = copyInto({ vfs, state, now, errors, real: dest.path, shown: to }, { ...state.nodes }, source.path, dest.path)
  return done(withNodes(state, nodes), errors)
}

/**
 * ln -s: a link at `path` holding `target` exactly as typed. The target need not exist.
 * @param {Vfs} vfs
 * @param {FsState} state
 * @param {{ target: string, path: string }} args
 * @param {number} now
 * @returns {FsOpResult}
 */
export const symlink = (vfs, state, { target, path }, now) => {
  const spot = locate(vfs, path)
  if (!spot.ok) return fail(spot.errno, path)
  if (!target) return fail('ENOENT', path)
  if (spot.node) return fail('EEXIST', path)
  const refused = cannotWrite(state, spot, path)
  if (refused) return refused
  return done(withNodes(state, { ...state.nodes, [spot.path]: symlinkNode(target, now) }))
}
