// @ts-check
// What the GUI lets the visitor change: their own files and folders under HOME, never what shipped with rafeyOS.
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { isSpecialFolder } from '@/components/rafeyos/core/vfs/fsState'

/**
 * @import { Vfs } from '@/components/rafeyos/core/vfs/buildVfs'
 * @typedef {{ user?: boolean, owned?: boolean, trashedFrom?: string }} Ownership the flags mergeState sets
 */

/** @param {Vfs} vfs @param {string} path */
const ownershipOf = (vfs, path) => /** @type {Ownership | undefined} */ (/** @type {unknown} */ (vfs[path]))

/**
 * Whether Rename and Move to Trash apply: the visitor's own item, not in Trash, and not Desktop, Documents or Downloads.
 * @param {Vfs} vfs
 * @param {string} path
 */
export const isVisitorItem = (vfs, path) => {
  const node = ownershipOf(vfs, path)
  if (!node || node.trashedFrom || isSpecialFolder(path)) return false
  return Boolean(node.user || node.owned)
}

/**
 * Whether `path` sits in Trash.
 * @param {Vfs} vfs
 * @param {string} path
 */
export const isTrashed = (vfs, path) => Boolean(ownershipOf(vfs, path)?.trashedFrom)

/**
 * Whether New Folder applies: home, or one of the visitor's own folders.
 * @param {Vfs} vfs
 * @param {string} folder
 */
export const canCreateIn = (vfs, folder) => {
  const node = ownershipOf(vfs, folder)
  return folder === HOME || Boolean(node?.owned && !node.trashedFrom)
}
