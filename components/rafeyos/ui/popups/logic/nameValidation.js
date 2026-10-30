// @ts-check
// What the name popover says about a typed name, worded as Nautilus's filename checks are. Pure.
import { NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { MAX_NAME } from '@/components/rafeyos/core/vfs/fsState'

/** @import { VfsNode } from '@/components/rafeyos/core/vfs/buildVfs' */

/**
 * ok: the button can act. message: why not, or (with ok) a warning worth showing anyway.
 * @typedef {{ ok: boolean, message: string | null }} NameCheck
 */

/** @param {string | null} message @returns {NameCheck} */
const refuse = (message) => ({ ok: false, message })

/**
 * @param {string} name as typed
 * @param {{ isFolder: boolean, existing?: VfsNode }} context isFolder: what is being named; existing: the node
 *   already holding that name in the folder, when it isn't the item being renamed
 * @returns {NameCheck}
 */
export const checkName = (name, { isFolder, existing }) => {
  const kind = isFolder ? 'folder' : 'file'
  const Kind = isFolder ? 'Folder' : 'File'
  if (!name) return refuse(null)
  if (name === '.' || name === '..') return refuse(`A ${kind} cannot be called “${name}”.`)
  if (name.includes('/')) return refuse(`${Kind} names cannot contain “/”.`)
  if (name.length > MAX_NAME) return refuse(`${Kind} name is too long.`)
  if (existing) return refuse(`A ${existing.type === NODE_TYPES.DIR ? 'folder' : 'file'} with that name already exists.`)
  if (name.startsWith('.')) return { ok: true, message: `${Kind}s with “.” at the beginning of their name are hidden.` }
  return { ok: true, message: null }
}
