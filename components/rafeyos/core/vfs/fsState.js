// @ts-check
// The visitor's own files and trash as plain, serialisable data: what the store persists, and what
// mergeState lays over the shipped tree. Every path is absolute and strictly under HOME or TMP;
// TMP entries live in memory only, so serializeState leaves them out and Trash never holds them.
// Functions never mutate their input; they return a new frozen state.
import { HOME, NODE_TYPES, TMP } from './buildVfs'
import { documentName, isSaveFolder, trashItemPath } from './documents'
import { joinPath, parentOf } from './paths'

/** @import { Vfs, VfsNode } from './buildVfs' */
/** @import { LegacyDocuments } from './legacyDocuments' */

/** A visitor's copy of a shipped non-text file: it reads as the shipped node it points at. */
export const COPY = 'copy'

/**
 * `mtime` is always epoch milliseconds. A symlink's `target` is kept exactly as typed; a copy's `from` is a shipped path.
 * @typedef {Readonly<{ type: 'dir', mtime: number }>} DirNode
 * @typedef {Readonly<{ type: 'text', text: string, mtime: number }>} TextNode
 * @typedef {Readonly<{ type: 'symlink', target: string, mtime: number }>} SymlinkNode
 * @typedef {Readonly<{ type: 'copy', from: string, mtime: number }>} CopyNode
 * @typedef {DirNode | TextNode | SymlinkNode | CopyNode} FsNode
 * @typedef {TextNode | SymlinkNode | CopyNode} FileNode
 * @typedef {Readonly<{ node: FileNode, mtime: number }>} TrashEntry keyed by the file's original path; `mtime` is when it was trashed
 * @typedef {Readonly<{ v: 2, nodes: Readonly<Record<string, FsNode>>, trash: Readonly<Record<string, TrashEntry>> }>} FsState
 * @typedef {'invalid' | 'taken' | 'missing' | 'empty'} FsFailure
 * @typedef {{ ok: true, state: FsState, path?: string, name?: string } | { ok: false, reason: FsFailure }} FsResult
 */

const VERSION = 2
const LEGACY_VERSION = 1
const SEED_FOLDERS = Object.freeze(['Desktop', 'Documents', 'Downloads'])
const HOME_PREFIX = `${HOME}/`
const TMP_PREFIX = `${TMP}/`
/** NAME_MAX on Linux. */
export const MAX_NAME = 255

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/**
 * @param {unknown} value
 * @returns {value is number}
 */
const isTime = (value) => typeof value === 'number' && Number.isFinite(value)

/** @param {FsFailure} reason @returns {FsResult} */
const fail = (reason) => ({ ok: false, reason })

/** @param {number} mtime @returns {DirNode} */
export const dirNode = (mtime) => Object.freeze({ type: NODE_TYPES.DIR, mtime })

/** @param {string} text @param {number} mtime @returns {TextNode} */
export const textNode = (text, mtime) => Object.freeze({ type: NODE_TYPES.TEXT, text, mtime })

/** @param {string} target @param {number} mtime @returns {SymlinkNode} */
export const symlinkNode = (target, mtime) => Object.freeze({ type: NODE_TYPES.SYMLINK, target, mtime })

/** @param {string} from @param {number} mtime @returns {CopyNode} */
export const copyNode = (from, mtime) => Object.freeze({ type: COPY, from, mtime })

/** @param {FileNode} node @param {number} mtime @returns {TrashEntry} */
const trashEntry = (node, mtime) => Object.freeze({ node, mtime })

/**
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {Readonly<Record<string, TrashEntry>>} trash
 * @returns {FsState}
 */
const freezeState = (nodes, trash) => Object.freeze({ v: VERSION, nodes: Object.freeze(nodes), trash: Object.freeze(trash) })

/**
 * `state` with its nodes replaced and its trash kept.
 * @param {FsState} state
 * @param {Readonly<Record<string, FsNode>>} nodes
 */
export const withNodes = (state, nodes) => freezeState(nodes, state.trash)

/**
 * @template T
 * @param {Readonly<Record<string, T>>} map
 * @param {string} key
 */
export const without = (map, key) => {
  const next = { ...map }
  delete next[key]
  return next
}

/** @param {string} path */
const nameOf = (path) => path.slice(path.lastIndexOf('/') + 1)

/** @param {string} path */
const parentPath = (path) => /** @type {string} */ (parentOf(path))

/**
 * A name a folder can hold: not empty, not "." or "..", no "/" or NUL, and at most 255 characters.
 * @param {string} segment
 */
const isValidName = (segment) =>
  Boolean(segment) && segment !== '.' && segment !== '..' && !/[/\0]/.test(segment) && segment.length <= MAX_NAME

/**
 * @param {string} path
 * @param {string} prefix
 */
const isUnder = (path, prefix) => path.startsWith(prefix) && path.slice(prefix.length).split('/').every(isValidName)

/**
 * A normalised path strictly under HOME whose every segment is a valid name. Dotfiles and names without an extension count.
 * @param {string} path
 */
const isVisitorPath = (path) => isUnder(path, HOME_PREFIX)

/**
 * The same rules strictly under TMP, which lives in memory only.
 * @param {string} path
 */
const isTmpPath = (path) => isUnder(path, TMP_PREFIX)

/**
 * `nodes` with every folder from HOME (or TMP) down to `folder`, created at `now` where missing,
 * or null when a file sits in the way.
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {string} folder
 * @param {number} now
 * @returns {Record<string, FsNode> | null}
 */
const withFolders = (nodes, folder, now) => {
  if (folder === HOME || folder === TMP) return { ...nodes }
  const node = nodes[folder]
  if (node) return node.type === NODE_TYPES.DIR ? { ...nodes } : null
  const next = withFolders(nodes, parentPath(folder), now)
  if (next) next[folder] = dirNode(now)
  return next
}

/**
 * `nodes` with `node` written at `path` (replacing a file there), or null when a folder holds the path or blocks it.
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {string} path
 * @param {FsNode} node
 * @param {number} now when any missing folder on the way is created
 */
const withNode = (nodes, path, node, now) => {
  if (nodes[path]?.type === NODE_TYPES.DIR) return null
  const next = withFolders(nodes, parentPath(path), now)
  if (next) next[path] = node
  return next
}

/**
 * `nodes` with a text file written at `path`; see withNode.
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {string} path
 * @param {string} text
 * @param {number} now
 */
export const withFile = (nodes, path, text, now) => withNode(nodes, path, textNode(text, now), now)

/**
 * First visit: Desktop, Documents and Downloads, all empty.
 * @param {number} now
 * @returns {FsState}
 */
export const seedState = (now) =>
  freezeState(Object.fromEntries(SEED_FOLDERS.map((name) => [joinPath(HOME, name), dirNode(now)])), {})

/** @param {unknown} raw @returns {FsNode | null} */
const parseNode = (raw) => {
  if (!isRecord(raw) || !isTime(raw.mtime)) return null
  if (raw.type === NODE_TYPES.DIR) return dirNode(raw.mtime)
  if (raw.type === NODE_TYPES.TEXT && typeof raw.text === 'string') return textNode(raw.text, raw.mtime)
  if (raw.type === NODE_TYPES.SYMLINK && typeof raw.target === 'string' && raw.target) return symlinkNode(raw.target, raw.mtime)
  if (raw.type === COPY && typeof raw.from === 'string' && raw.from.startsWith('/')) return copyNode(raw.from, raw.mtime)
  return null
}

/** @param {string} path */
const depth = (path) => path.split('/').length

/**
 * @param {unknown} raw
 * @returns {Record<string, FsNode>}
 */
const parseNodes = (raw) => {
  /** @type {Record<string, FsNode>} */
  const nodes = {}
  if (!isRecord(raw)) return nodes
  // Shallow paths first, so a node is kept only when its parent folder was
  Object.keys(raw).sort((a, b) => depth(a) - depth(b)).forEach((path) => {
    const node = parseNode(raw[path])
    if (!node || !(isVisitorPath(path) || isTmpPath(path))) return
    const parent = parentPath(path)
    if (parent === HOME || parent === TMP || nodes[parent]?.type === NODE_TYPES.DIR) nodes[path] = node
  })
  return nodes
}

/**
 * A trash entry in either version: v1 held only text, v2 holds the file's node.
 * @param {unknown} entry
 * @param {number} version
 * @returns {TrashEntry | null}
 */
const parseTrashEntry = (entry, version) => {
  if (!isRecord(entry) || !isTime(entry.mtime)) return null
  if (version === LEGACY_VERSION) return typeof entry.text === 'string' ? trashEntry(textNode(entry.text, entry.mtime), entry.mtime) : null
  const node = parseNode(entry.node)
  return node && node.type !== NODE_TYPES.DIR ? trashEntry(node, entry.mtime) : null
}

/**
 * @param {unknown} raw
 * @param {number} version
 * @returns {Record<string, TrashEntry>}
 */
const parseTrash = (raw, version) => {
  /** @type {Record<string, TrashEntry>} */
  const trash = {}
  if (!isRecord(raw)) return trash
  Object.entries(raw).forEach(([path, value]) => {
    const entry = isVisitorPath(path) ? parseTrashEntry(value, version) : null
    if (entry) trash[path] = entry
  })
  return trash
}

/**
 * The stored value, already JSON-parsed. Null unless it is a version 1 or 2 envelope (version 1 is upgraded);
 * inside one, any entry that breaks the rules is dropped and the rest kept.
 * @param {unknown} raw
 * @returns {FsState | null}
 */
export const parseState = (raw) => {
  if (!isRecord(raw) || (raw.v !== VERSION && raw.v !== LEGACY_VERSION)) return null
  return freezeState(parseNodes(raw.nodes), parseTrash(raw.trash, raw.v))
}

/**
 * The persisted form: everything but TMP, which empties on every page load.
 * @param {FsState} state
 */
export const serializeState = (state) =>
  JSON.stringify({ ...state, nodes: Object.fromEntries(Object.entries(state.nodes).filter(([path]) => !isTmpPath(path))) })

/**
 * `state` with its TMP entries replaced by `source`'s: the store keeps TMP in memory and lays it over every read.
 * @param {FsState} state
 * @param {FsState} source
 * @returns {FsState}
 */
export const withTmpFrom = (state, source) => {
  if (state === source) return state
  const kept = Object.entries(state.nodes).filter(([path]) => !isTmpPath(path))
  const tmp = Object.entries(source.nodes).filter(([path]) => isTmpPath(path))
  if (!tmp.length && kept.length === Object.keys(state.nodes).length) return state
  return freezeState(Object.fromEntries([...kept, ...tmp]), state.trash)
}

/**
 * Whether `after` differs from `before` only under TMP, so the change can skip storage.
 * @param {FsState} before
 * @param {FsState} after
 */
export const changesOnlyTmp = (before, after) => {
  if (before.trash !== after.trash) return false
  const paths = new Set([...Object.keys(before.nodes), ...Object.keys(after.nodes)])
  return [...paths].every((path) => isTmpPath(path) || before.nodes[path] === after.nodes[path])
}

/**
 * Adds legacy files whose path is free in both `nodes` and `trash` (so a file trashed here stays trashed),
 * and legacy trash entries whose path is likewise free and not just added live. Nothing new returns `state` itself.
 * @param {FsState} state
 * @param {LegacyDocuments} legacy
 * @param {number} now
 * @returns {FsState}
 */
export const mergeLegacy = (state, legacy, now) => {
  // A path already live or trashed here wins, so an old tab's stale trash never shadows a restored file
  const free = (/** @type {string} */ path) =>
    !Object.hasOwn(state.nodes, path) && !Object.hasOwn(state.trash, path) && isVisitorPath(path)
  const files = Object.entries(legacy.files).filter(([path]) => free(path))
  const nodes = files.reduce((acc, [path, text]) => withFile(acc, path, text, now) ?? acc, state.nodes)
  // Checked against the merged nodes too, so a legacy file and trash entry at one path keep only the live file
  const trashed = Object.entries(legacy.trash).filter(([path]) => free(path) && !Object.hasOwn(nodes, path))
  if (nodes === state.nodes && !trashed.length) return state
  const trash = { ...state.trash, ...Object.fromEntries(trashed.map(([path, text]) => [path, trashEntry(textNode(text, now), now)])) }
  return freezeState(nodes, trash)
}

/**
 * The first state for a visitor who saved files with an older build.
 * @param {LegacyDocuments} legacy
 * @param {number} now
 */
export const migrateLegacy = (legacy, now) => mergeLegacy(seedState(now), legacy, now)

/**
 * The vfs fields a visitor node reads as, or null when it reads as nothing (a copy whose shipped file is gone).
 * A copy takes its shipped file's fields; the caller sets `path` and `name` over them. Files under HOME carry `user`, so the GUI offers them to Trash;
 * folders and everything in TMP never do.
 * @param {Vfs} base
 * @param {string} path
 * @param {FsNode} node
 */
const nodeFields = (base, path, node) => {
  if (node.type === NODE_TYPES.DIR) return { type: node.type, mtime: node.mtime }
  const user = isTmpPath(path) ? {} : { user: true }
  if (node.type === NODE_TYPES.TEXT) return { type: node.type, text: node.text, mtime: node.mtime, ...user }
  if (node.type === NODE_TYPES.SYMLINK) return { type: node.type, target: node.target, mtime: node.mtime, ...user }
  const shipped = base[node.from]
  if (!shipped || shipped.type === NODE_TYPES.DIR || shipped.type === NODE_TYPES.SYMLINK) return null
  return { ...shipped, mtime: node.mtime, ...user }
}

/**
 * The shipped tree with the visitor's files laid over it; a shipped path always wins.
 * @param {Vfs} base
 * @param {FsState} state
 * @returns {Vfs}
 */
export const mergeState = (base, state) => {
  /** @type {Record<string, VfsNode>} */
  const merged = { ...base }
  Object.entries(state.nodes).forEach(([path, node]) => {
    const fields = base[path] ? null : nodeFields(base, path, node)
    if (fields) merged[path] = /** @type {VfsNode} */ (Object.freeze({ ...fields, path, name: nameOf(path) }))
  })
  Object.entries(state.trash).forEach(([original, entry]) => {
    const path = trashItemPath(original)
    const fields = base[path] ? null : nodeFields(base, original, entry.node)
    if (!fields) return
    const node = { ...fields, path, name: nameOf(original), mtime: entry.mtime, trashedFrom: original }
    merged[path] = /** @type {VfsNode} */ (Object.freeze(node))
  })
  return Object.freeze(merged)
}

/**
 * Save and Save-and-Replace: writes the file into a save folder that exists, replacing the visitor's file there.
 * @param {FsState} state
 * @param {string} folder
 * @param {string} name typed name; .txt is added when it has no extension
 * @param {string} text
 * @param {number} now
 * @returns {FsResult}
 */
export const saveFile = (state, folder, name, text, now) => {
  const checked = documentName(name)
  if (!checked.ok || !checked.name || !isSaveFolder(folder)) return fail('invalid')
  if (folder !== HOME && state.nodes[folder]?.type !== NODE_TYPES.DIR) return fail('missing')
  const path = joinPath(folder, checked.name)
  const nodes = withFile(state.nodes, path, String(text), now)
  if (!nodes) return fail('taken')
  return { ok: true, state: freezeState(nodes, state.trash), path, name: checked.name }
}

/**
 * The visitor's file (text, copy or link) moves into trash, replacing an older entry for the same path.
 * @param {FsState} state
 * @param {string} path
 * @param {number} now when it was trashed
 * @returns {FsResult}
 */
export const moveToTrash = (state, path, now) => {
  if (!isVisitorPath(path)) return fail('invalid')
  const node = state.nodes[path]
  if (!node) return fail('missing')
  if (node.type === NODE_TYPES.DIR) return fail('invalid')
  return { ok: true, state: freezeState(without(state.nodes, path), { ...state.trash, [path]: trashEntry(node, now) }), path }
}

/**
 * Puts a trashed file back at its original path, recreating any folder on the way.
 * @param {FsState} state
 * @param {string} path the original path
 * @param {number} now
 * @returns {FsResult}
 */
export const restoreFromTrash = (state, path, now) => {
  if (!Object.hasOwn(state.trash, path)) return fail('missing')
  if (Object.hasOwn(state.nodes, path)) return fail('taken')
  const nodes = withNode(state.nodes, path, Object.freeze({ ...state.trash[path].node, mtime: now }), now)
  if (!nodes) return fail('taken')
  return { ok: true, state: freezeState(nodes, without(state.trash, path)), path }
}

/**
 * Drops every trashed file.
 * @param {FsState} state
 * @returns {FsResult}
 */
export const emptyTrash = (state) =>
  Object.keys(state.trash).length ? { ok: true, state: freezeState(state.nodes, {}) } : fail('empty')
