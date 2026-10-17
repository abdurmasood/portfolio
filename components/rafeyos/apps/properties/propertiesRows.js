// The rows GNOME Files' Properties dialog shows for a path (mockup subset).
import { NODE_TYPES } from '../../vfs/buildVfs'
import { absPath, parentOf } from '../../vfs/paths'
import { isDir, kindOf, sizeLabel } from '../../vfs/queries'

// ~ has no parent in the vfs; on disk it lives in /home
const HOME_PARENT = '/home'

/** @returns {{ label: string, value: string }[]} Size, Type, Link Target (symlinks only), Parent Folder */
export const propertiesRows = (vfs, path) => {
  const node = vfs[path]
  const parent = parentOf(path)
  return [
    { label: 'Size', value: sizeLabel(vfs, path) },
    { label: 'Type', value: isDir(vfs, path) ? 'Folder' : kindOf(vfs, path) },
    ...(node.type === NODE_TYPES.SYMLINK ? [{ label: 'Link Target', value: absPath(node.target) }] : []),
    { label: 'Parent Folder', value: parent ? absPath(parent) : HOME_PARENT },
    ...(node.trashedFrom ? [{ label: 'Original Location', value: absPath(node.trashedFrom) }] : []),
  ]
}
