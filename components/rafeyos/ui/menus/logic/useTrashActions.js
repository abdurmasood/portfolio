import { useCallback } from 'react'
import { useVfs, useWindowManager, useWindowsState } from '@/components/rafeyos/state/logic/contexts'
import { WINDOW_PHASES } from '@/components/rafeyos/state/logic/windowsReducer'
import { TRASH } from '@/components/rafeyos/core/vfs/buildVfs'
import { children } from '@/components/rafeyos/core/vfs/queries'
import { parentOf } from '@/components/rafeyos/core/vfs/paths'
import { placeLabel } from '@/components/rafeyos/core/vfs/documents'
import { useNotify } from '@/components/rafeyos/state/logic/useNotify'
import { APP } from '@/components/rafeyos/core/catalog/apps'
import { reasonBody } from '@/components/rafeyos/ui/menus/logic/storageFailure'

/** Tells the visitor a Trash change wasn't written; a successful one shows for itself. */
const reportFailure = (notify, title, result) => {
  if (!result.ok) notify({ appId: APP.FILES, title, body: reasonBody(result.reason) })
}

/** Clears Trash for good. Null while the bin is empty, so the menu item stays disabled. */
export const useEmptyTrash = () => {
  const { vfs, emptyTrashDocument } = useVfs()
  const windows = useWindowsState()
  const windowManager = useWindowManager()
  const notify = useNotify()
  const full = children(vfs, TRASH).length > 0
  const run = useCallback(() => {
    Object.values(windows.byId).forEach((win) => {
      if (win.appId === APP.EDITOR && win.phase !== WINDOW_PHASES.CLOSING && vfs[win.arg]?.trashedFrom) windowManager.close(win.id)
    })
    reportFailure(notify, "Couldn't empty Trash", emptyTrashDocument())
  }, [vfs, windows, windowManager, emptyTrashDocument, notify])
  return full ? run : null
}

const openEditor = (windows, path) =>
  Object.values(windows.byId).find(
    (win) => win.appId === APP.EDITOR && win.arg === path && win.phase !== WINDOW_PHASES.CLOSING,
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
            appId: APP.FILES,
            title: blocked ? `Can't restore ${node.name}` : "Couldn't restore",
            body: blocked
              ? `A file named ${node.name} is already in ${folder}.`
              : reasonBody(result.reason),
          })
        },
      }
    }
    if (!node?.user) return {}
    const trash = () => reportFailure(notify, "Couldn't move to Trash", trashDocument(path))
    return {
      trash: () => {
        const win = openEditor(windows, path)
        if (!win) {
          trash()
          return
        }
        windowManager.close(win.id, trash)
      },
    }
  }, [vfs, windows, windowManager, trashDocument, restoreDocument, notify])
}
