// Where and under what name the visitor may save a document. fsState holds the files themselves.
import { HOME, TRASH } from './buildVfs'
import { joinPath } from './paths'

export const DOCUMENTS = joinPath(HOME, 'Documents')

/** Folders a new file may be saved into. Portfolio folders stay out. */
export const SAVE_FOLDERS = Object.freeze([
  Object.freeze({ path: HOME, label: 'Home', icon: 'home' }),
  Object.freeze({ path: joinPath(HOME, 'Desktop'), label: 'Desktop', icon: 'desktop' }),
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

/** "/home/visitor/Desktop" + "notes.txt" -> "/home/visitor/Desktop/notes.txt". */
export const filePath = (folder, name) => joinPath(folder, name)

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

/** Vfs path for a trashed file. One path segment, so it is a direct child of Trash. */
export const trashItemPath = (original) => `${TRASH}/${encodeURIComponent(original)}`
