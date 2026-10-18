import { useCallback } from 'react'
import { useVfs, useWindowManager, useWindowsState } from '../../../state/contexts'
import { WINDOW_PHASES } from '../../../state/windowsReducer'
import { TRASH } from '../../../vfs/buildVfs'
import { children } from '../../../vfs/queries'
import { parentOf } from '../../../vfs/paths'
import { placeLabel } from '../../../vfs/documents'
import { useNotify } from '../../popups/js/useNotify'

/** Clears Trash for good. Null while the bin is empty, so the menu item stays disabled. */
export const useEmptyTrash = () => {
  const { vfs, emptyTrashDocument } = useVfs()
  const windows = useWindowsState()
  const windowManager = useWindowManager()
  const full = children(vfs, TRASH).length > 0
  const run = useCallback(() => {
    Object.values(windows.byId).forEach((win) => {
      if (win.appId === 'editor' && win.phase !== WINDOW_PHASES.CLOSING && vfs[win.arg]?.trashedFrom) windowManager.close(win.id)
    })
    emptyTrashDocument()
  }, [vfs, windows, windowManager, emptyTrashDocument])
  return full ? run : null
}

const openEditor = (windows, path) =>
  Object.values(windows.byId).find(
    (win) => win.appId === 'editor' && win.arg === path && win.phase !== WINDOW_PHASES.CLOSING,
  )

/** Trash and Restore for one path, or neither when the file shipped with rafeyOS. */
export const useTrashActions = () => {
  const { vfs, trashDocument, restoreDocument } = useVfs()
  const windows = useWindowsState()
  const windowManager = useWindowManager()
  const notify = useNotify()
  return useCallback((path) => {
    const node = vfs[path]
    if (node?.trashedFrom) {
      return {
        restore: () => {
          const result = restoreDocument(node.trashedFrom)
          if (result.ok) return
          const blocked = result.reason === 'taken'
          const folder = placeLabel(parentOf(node.trashedFrom))
          notify({
            appId: 'files',
            title: blocked ? `Can't restore ${node.name}` : "Couldn't restore",
            body: blocked
              ? `A file named ${node.name} is already in ${folder}.`
              : 'This browser blocked saving the file.',
          })
        },
      }
    }
    if (!node?.user) return {}
    return {
      trash: () => {
        const win = openEditor(windows, path)
        if (!win) {
          trashDocument(path)
          return
        }
        windowManager.close(win.id, () => trashDocument(path))
      },
    }
  }, [vfs, windows, windowManager, trashDocument, restoreDocument, notify])
}
