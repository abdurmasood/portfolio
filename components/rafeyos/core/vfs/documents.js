// Visitor documents saved in this browser. Shipped files never go through here.
import { HOME, NODE_TYPES, TRASH } from './buildVfs'

export const DOCUMENTS = '~/Documents'
export const DOCUMENTS_KEY = 'rafeyos-documents'

/** Folders a new file may be saved into. Portfolio folders stay out. */
export const SAVE_FOLDERS = Object.freeze([
  Object.freeze({ path: HOME, label: 'Home', icon: 'home' }),
  Object.freeze({ path: '~/Desktop', label: 'Desktop', icon: 'desktop' }),
  Object.freeze({ path: DOCUMENTS, label: 'Documents', icon: 'folder' }),
])

export const isSaveFolder = (folder) => SAVE_FOLDERS.some((place) => place.path === folder)

export const placeLabel = (folder) => SAVE_FOLDERS.find((place) => place.path === folder)?.label ?? folder

const hasExtension = (name) => name.includes('.')

/** A single file name, or a rejection. Adds .txt when the visitor left the extension off. */
export const documentName = (raw) => {
  const name = String(raw ?? '').trim()
  if (!name || name === '.' || name === '..' || /[/\\]/.test(name)) return { ok: false }
  return { ok: true, name: hasExtension(name) ? name : `${name}.txt` }
}

/** "~/Desktop" + "notes.txt" -> "~/Desktop/notes.txt". Home is "~". */
export const filePath = (folder, name) => `${folder}/${name}`

/**
 * What Save should do with a typed name in a chosen folder.
 * A shipped path is blocked. The visitor's own file can be replaced. An open one cannot.
 * @returns {{ type: 'invalid' } | { type: 'write' | 'replace' | 'open' | 'blocked', name: string, path: string, folder: string }}
 */
export const saveChoice = ({ raw, folder, userPaths, openPaths, blockedPaths, currentPath = null }) => {
  const checked = documentName(raw)
  if (!checked.ok || !isSaveFolder(folder)) return { type: 'invalid' }
  const path = filePath(folder, checked.name)
  const picked = { name: checked.name, path, folder }
  if (path === currentPath) return { type: 'write', ...picked }
  if (blockedPaths.includes(path)) return { type: 'blocked', ...picked }
  if (openPaths.includes(path)) return { type: 'open', ...picked }
  if (userPaths.includes(path)) return { type: 'replace', ...picked }
  return { type: 'write', ...picked }
}

const userNode = (path, name, text) => Object.freeze({ path, name, type: NODE_TYPES.TEXT, text, user: true })

/** Vfs path for a trashed file. One path segment, so it is a direct child of Trash. */
export const trashItemPath = (original) => `${TRASH}/${encodeURIComponent(original)}`

export const emptyDocuments = () => ({ files: {}, trash: {} })

const without = (map, path) => {
  const next = { ...map }
  delete next[path]
  return next
}

/** The live file moves into trash. An unknown path leaves the state untouched. */
/** Drops every trashed file. An empty bin leaves the state untouched. */
export const emptyTrash = (state) => (Object.keys(state.trash).length ? { files: state.files, trash: {} } : null)

export const moveToTrash = (state, path) => {
  if (typeof state.files[path] !== 'string') return null
  return { files: without(state.files, path), trash: { ...state.trash, [path]: state.files[path] } }
}

/**
 * Puts a trashed file back. A shipped path or a live file at that path stays in trash.
 * @returns {{ ok: true, state: object } | { ok: false, reason: 'taken' | 'missing' }}
 */
export const restoreFromTrash = (state, path, takenPaths) => {
  if (typeof state.trash[path] !== 'string') return { ok: false, reason: 'missing' }
  if (takenPaths.includes(path) || typeof state.files[path] === 'string') return { ok: false, reason: 'taken' }
  return {
    ok: true,
    state: { files: { ...state.files, [path]: state.trash[path] }, trash: without(state.trash, path) },
  }
}

/** A stored key is a full path. A bare name is a Documents file from before folders existed. */
const storedPath = (key) => (key.includes('/') ? key : filePath(DOCUMENTS, key))

const savedFiles = (files) => {
  if (!files || typeof files !== 'object' || Array.isArray(files)) return []
  return Object.entries(files).flatMap(([key, text]) => {
    if (typeof text !== 'string') return []
    const path = storedPath(key)
    const slash = path.lastIndexOf('/')
    const folder = path.slice(0, slash)
    const name = path.slice(slash + 1)
    const checked = documentName(name)
    if (!checked.ok || checked.name !== name || !isSaveFolder(folder) || filePath(folder, name) !== path) return []
    return [[path, text]]
  })
}

const fileName = (path) => path.slice(path.lastIndexOf('/') + 1)

const trashedNode = (original, text) => {
  const path = trashItemPath(original)
  return Object.freeze({ path, name: fileName(original), type: NODE_TYPES.TEXT, text, user: true, trashedFrom: original })
}

/** A new frozen vfs with the visitor's files added. Skips anything that would cover a shipped node. */
export const mergeDocuments = (vfs, files, trash = {}) => {
  const entries = savedFiles(files).filter(([path]) => !vfs[path])
  const trashed = savedFiles(trash).filter(([original]) => !vfs[trashItemPath(original)])
  if (!entries.length && !trashed.length) return vfs
  const merged = { ...vfs }
  entries.forEach(([path, text]) => {
    merged[path] = userNode(path, fileName(path), text)
  })
  trashed.forEach(([original, text]) => {
    merged[trashItemPath(original)] = trashedNode(original, text)
  })
  return Object.freeze(merged)
}

const isEnvelope = (parsed) =>
  parsed.files && typeof parsed.files === 'object' && !Array.isArray(parsed.files) &&
  parsed.trash && typeof parsed.trash === 'object' && !Array.isArray(parsed.trash)

/** Flat path maps are the live list. An envelope keeps both lists. A fake `{}` is empty. */
export const asDocuments = (parsed) => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyDocuments()
  if (isEnvelope(parsed)) {
    return { files: Object.fromEntries(savedFiles(parsed.files)), trash: Object.fromEntries(savedFiles(parsed.trash)) }
  }
  return { files: Object.fromEntries(savedFiles(parsed)), trash: {} }
}

const readFiles = (storage) => {
  try {
    return asDocuments(JSON.parse(storage.getItem(DOCUMENTS_KEY) || ''))
  } catch {
    return emptyDocuments()
  }
}

/** localStorage (or a test fake) behind load/save. A blocked or broken store loads as empty and refuses writes. */
export const createDocumentsStore = (storage) => ({
  load: () => (storage ? readFiles(storage) : emptyDocuments()),
  save: (files) => {
    if (!storage) return false
    try {
      storage.setItem(DOCUMENTS_KEY, JSON.stringify(files))
      return true
    } catch {
      return false
    }
  },
})
