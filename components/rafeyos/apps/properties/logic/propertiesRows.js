// The rows GNOME Files' Properties dialog shows for a path (mockup subset).
import { NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { absPath, parentOf } from '@/components/rafeyos/core/vfs/paths'
import { isDir, kindOf, sizeLabel } from '@/components/rafeyos/core/vfs/queries'

/**
 * A path that is gone (the shell removed it while the window was open) reads as an Unknown file of 0 bytes.
 * @returns {{ label: string, value: string }[]} Size, Type, Link Target (symlinks only), Parent Folder (all but the root)
 */
export const propertiesRows = (vfs, path) => {
  const node = vfs[path]
  const parent = parentOf(path)
  return [
    { label: 'Size', value: sizeLabel(vfs, path) },
    { label: 'Type', value: isDir(vfs, path) ? 'Folder' : kindOf(vfs, path) },
    ...(node?.type === NODE_TYPES.SYMLINK ? [{ label: 'Link Target', value: absPath(node.target) }] : []),
    ...(parent ? [{ label: 'Parent Folder', value: absPath(parent) }] : []),
    ...(node?.trashedFrom ? [{ label: 'Original Location', value: absPath(node.trashedFrom) }] : []),
  ]
}
