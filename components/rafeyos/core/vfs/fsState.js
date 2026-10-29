// @ts-check
// The visitor's own files and trash as plain, serialisable data: what the store persists, and what
// mergeState lays over the shipped tree. Every path is absolute and strictly under HOME.
// Functions never mutate their input; they return a new frozen state.
import { HOME, NODE_TYPES } from './buildVfs'
import { documentName, isSaveFolder, trashItemPath } from './documents'
import { joinPath, parentOf } from './paths'

/** @import { Vfs, VfsNode } from './buildVfs' */
/** @import { LegacyDocuments } from './legacyDocuments' */

/**
 * `mtime` is always epoch milliseconds.
 * @typedef {Readonly<{ type: 'dir', mtime: number }> | Readonly<{ type: 'text', text: string, mtime: number }>} FsNode
 * @typedef {Readonly<{ text: string, mtime: number }>} TrashEntry keyed by the file's original path
 * @typedef {Readonly<{ v: 1, nodes: Readonly<Record<string, FsNode>>, trash: Readonly<Record<string, TrashEntry>> }>} FsState
 * @typedef {'invalid' | 'taken' | 'missing' | 'empty'} FsFailure
 * @typedef {{ ok: true, state: FsState, path?: string, name?: string } | { ok: false, reason: FsFailure }} FsResult
 */

const VERSION = 1
const SEED_FOLDERS = Object.freeze(['Desktop', 'Documents', 'Downloads'])
const HOME_PREFIX = `${HOME}/`

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

/** @param {number} mtime @returns {FsNode} */
const dirNode = (mtime) => Object.freeze({ type: NODE_TYPES.DIR, mtime })

/** @param {string} text @param {number} mtime @returns {FsNode} */
const textNode = (text, mtime) => Object.freeze({ type: NODE_TYPES.TEXT, text, mtime })

/** @param {string} text @param {number} mtime @returns {TrashEntry} */
const trashEntry = (text, mtime) => Object.freeze({ text, mtime })

/**
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {Readonly<Record<string, TrashEntry>>} trash
 * @returns {FsState}
 */
const freezeState = (nodes, trash) => Object.freeze({ v: VERSION, nodes: Object.freeze(nodes), trash: Object.freeze(trash) })

/**
 * @template T
 * @param {Readonly<Record<string, T>>} map
 * @param {string} key
 */
const without = (map, key) => {
  const next = { ...map }
  delete next[key]
  return next
}

/** @param {string} path */
const nameOf = (path) => path.slice(path.lastIndexOf('/') + 1)

/** @param {string} path */
const parentPath = (path) => /** @type {string} */ (parentOf(path))

/**
 * A normalised path strictly under HOME whose every segment is a usable name.
 * A file also needs a complete name ("notes.txt", never "notes"), as Save always writes.
 * @param {string} path
 * @param {FsNode['type']} type
 */
const isVisitorPath = (path, type) => {
  if (!path.startsWith(HOME_PREFIX)) return false
  const segments = path.slice(HOME_PREFIX.length).split('/')
  if (!segments.every((segment) => segment === segment.trim() && documentName(segment).ok)) return false
  const name = segments[segments.length - 1]
  return type === NODE_TYPES.DIR || documentName(name).name === name
}

/**
 * `nodes` with every folder from HOME down to `folder`, created at `now` where missing,
 * or null when a file sits in the way.
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {string} folder
 * @param {number} now
 * @returns {Record<string, FsNode> | null}
 */
const withFolders = (nodes, folder, now) => {
  if (folder === HOME) return { ...nodes }
  const node = nodes[folder]
  if (node) return node.type === NODE_TYPES.DIR ? { ...nodes } : null
  const next = withFolders(nodes, parentPath(folder), now)
  if (next) next[folder] = dirNode(now)
  return next
}

/**
 * `nodes` with the file written at `path` (replacing a file there), or null when a folder holds the path or blocks it.
 * @param {Readonly<Record<string, FsNode>>} nodes
 * @param {string} path
 * @param {string} text
 * @param {number} now
 */
const withFile = (nodes, path, text, now) => {
  if (nodes[path]?.type === NODE_TYPES.DIR) return null
  const next = withFolders(nodes, parentPath(path), now)
  if (next) next[path] = textNode(text, now)
  return next
}

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
    if (!node || !isVisitorPath(path, node.type)) return
    const parent = parentPath(path)
    if (parent === HOME || nodes[parent]?.type === NODE_TYPES.DIR) nodes[path] = node
  })
  return nodes
}

/**
 * @param {unknown} raw
 * @returns {Record<string, TrashEntry>}
 */
const parseTrash = (raw) => {
  /** @type {Record<string, TrashEntry>} */
  const trash = {}
  if (!isRecord(raw)) return trash
  Object.entries(raw).forEach(([path, entry]) => {
    if (!isVisitorPath(path, NODE_TYPES.TEXT) || !isRecord(entry)) return
    if (typeof entry.text === 'string' && isTime(entry.mtime)) trash[path] = trashEntry(entry.text, entry.mtime)
  })
  return trash
}

/**
 * The stored value, already JSON-parsed. Null unless it is a version 1 envelope;
 * inside one, any entry that breaks the rules is dropped and the rest kept.
 * @param {unknown} raw
 * @returns {FsState | null}
 */
export const parseState = (raw) => {
  if (!isRecord(raw) || raw.v !== VERSION) return null
  return freezeState(parseNodes(raw.nodes), parseTrash(raw.trash))
}

/** @param {FsState} state */
export const serializeState = (state) => JSON.stringify(state)

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
    !Object.hasOwn(state.nodes, path) && !Object.hasOwn(state.trash, path) && isVisitorPath(path, NODE_TYPES.TEXT)
  const files = Object.entries(legacy.files).filter(([path]) => free(path))
  const nodes = files.reduce((acc, [path, text]) => withFile(acc, path, text, now) ?? acc, state.nodes)
  // Checked against the merged nodes too, so a legacy file and trash entry at one path keep only the live file
  const trashed = Object.entries(legacy.trash).filter(([path]) => free(path) && !Object.hasOwn(nodes, path))
  if (nodes === state.nodes && !trashed.length) return state
  const trash = { ...state.trash, ...Object.fromEntries(trashed.map(([path, text]) => [path, trashEntry(text, now)])) }
  return freezeState(nodes, trash)
}

/**
 * The first state for a visitor who saved files with an older build.
 * @param {LegacyDocuments} legacy
 * @param {number} now
 */
export const migrateLegacy = (legacy, now) => mergeLegacy(seedState(now), legacy, now)

/**
 * The shipped tree with the visitor's files laid over it; a shipped path always wins.
 * Folders carry no `user` flag, so the GUI never offers to trash them.
 * @param {Vfs} base
 * @param {FsState} state
 * @returns {Vfs}
 */
export const mergeState = (base, state) => {
  /** @type {Record<string, VfsNode>} */
  const merged = { ...base }
  Object.entries(state.nodes).forEach(([path, node]) => {
    if (base[path]) return
    const fields = node.type === NODE_TYPES.DIR
      ? { type: node.type, mtime: node.mtime }
      : { type: node.type, text: node.text, mtime: node.mtime, user: true }
    merged[path] = Object.freeze({ path, name: nameOf(path), ...fields })
  })
  Object.entries(state.trash).forEach(([original, entry]) => {
    const path = trashItemPath(original)
    if (base[path]) return
    const fields = { type: NODE_TYPES.TEXT, text: entry.text, mtime: entry.mtime, user: true, trashedFrom: original }
    merged[path] = Object.freeze({ path, name: nameOf(original), ...fields })
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
 * The visitor's file moves into trash, replacing an older entry for the same path.
 * @param {FsState} state
 * @param {string} path
 * @param {number} now when it was trashed
 * @returns {FsResult}
 */
export const moveToTrash = (state, path, now) => {
  if (!isVisitorPath(path, NODE_TYPES.TEXT)) return fail('invalid')
  const node = state.nodes[path]
  if (!node) return fail('missing')
  if (node.type !== NODE_TYPES.TEXT) return fail('invalid')
  return { ok: true, state: freezeState(without(state.nodes, path), { ...state.trash, [path]: trashEntry(node.text, now) }), path }
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
  const nodes = withFile(state.nodes, path, state.trash[path].text, now)
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
