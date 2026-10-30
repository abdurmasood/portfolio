// @ts-check
// Reads what older builds saved under `rafeyos-documents`, so the visitor's files survive the move to fsState.
import { HOME } from './buildVfs'
import { DOCUMENTS, documentName, isSaveFolder } from './documents'
import { joinPath } from './paths'

/** @typedef {{ files: Record<string, string>, trash: Record<string, string> }} LegacyDocuments path -> text */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/**
 * A bare name is a Documents file from before folders existed,
 * and a "~/..." key was saved before home was /home/visitor.
 * @param {string} key
 */
const storedPath = (key) => {
  if (key.startsWith('~/')) return HOME + key.slice(1)
  return key.includes('/') ? key : joinPath(DOCUMENTS, key)
}

/**
 * The entries the old build would have shown: text, a complete file name, in a save folder.
 * @param {unknown} map
 * @returns {Record<string, string>}
 */
const savedFiles = (map) => {
  if (!isRecord(map)) return {}
  return Object.fromEntries(Object.entries(map).flatMap(([key, text]) => {
    if (typeof text !== 'string') return []
    const path = storedPath(key)
    const slash = path.lastIndexOf('/')
    const name = path.slice(slash + 1)
    const checked = documentName(name)
    if (!checked.ok || checked.name !== name || !isSaveFolder(path.slice(0, slash))) return []
    return [[path, text]]
  }))
}

/**
 * The old value, already JSON-parsed: an envelope `{ files, trash }`, or a flat path map from
 * before Trash existed. Keys come out as absolute visitor paths; anything else is dropped.
 * @param {unknown} raw
 * @returns {LegacyDocuments}
 */
export const readLegacy = (raw) => {
  if (!isRecord(raw)) return { files: {}, trash: {} }
  // A flat map never holds an object value, so `files` being one marks an envelope even when `trash` is junk
  if (isRecord(raw.files)) return { files: savedFiles(raw.files), trash: savedFiles(raw.trash) }
  return { files: savedFiles(raw), trash: {} }
}
