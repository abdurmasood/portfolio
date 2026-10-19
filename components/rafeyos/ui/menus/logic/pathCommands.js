// What the file menus, Properties and the editor can do with a path. Pure apart from the
// injected window manager and opener, so the menus built from it are testable alone.
import { HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { parentOf, realPath } from '@/components/rafeyos/core/vfs/paths'
import { isDir } from '@/components/rafeyos/core/vfs/queries'

/**
 * @param {{ vfs: object, windowManager: object, openPath: Function }} deps
 * @param {string} path - as shown (a symlink stays a symlink, so Properties can show its target)
 */
export const pathCommands = ({ vfs, windowManager, openPath }, path) => {
  const target = realPath(vfs, path)
  const folder = isDir(vfs, path)
  const parent = parentOf(target) ?? HOME
  return Object.freeze({
    open: () => openPath(path),
    // A file's terminal opens in the folder that holds it
    openTerminal: () => windowManager.openApp('terminal', { path: folder ? target : parent }),
    showInFiles: () => windowManager.openApp('files', { path: parent, init: { select: target } }),
    properties: () => windowManager.openApp('properties', { path }),
  })
}
