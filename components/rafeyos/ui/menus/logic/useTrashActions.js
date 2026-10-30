import { useCallback } from 'react'
import { useVfs, useWindowManager, useWindowsState } from '@/components/rafeyos/state/logic/contexts'
import { WINDOW_PHASES } from '@/components/rafeyos/state/logic/windowsReducer'
import { NODE_TYPES, TRASH } from '@/components/rafeyos/core/vfs/buildVfs'
import { children } from '@/components/rafeyos/core/vfs/queries'
import { parentOf } from '@/components/rafeyos/core/vfs/paths'
import { placeLabel } from '@/components/rafeyos/core/vfs/documents'
import { useNotify } from '@/components/rafeyos/state/logic/useNotify'
import { APP } from '@/components/rafeyos/core/catalog/apps'
import { isStorageFailure, reasonBody } from '@/components/rafeyos/ui/menus/logic/storageFailure'
import { isVisitorItem } from './visitorItems'

/** Tells the visitor the browser refused a Trash change; a successful one shows for itself. */
const reportFailure = (notify, title, result) => {
  if (!result.ok && isStorageFailure(result.reason)) notify({ appId: APP.FILES, title, body: reasonBody(result.reason) })
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

/** Editor windows on `path`, or on any file inside it when it is a folder. */
const openEditors = (windows, path) =>
  Object.values(windows.byId).filter(
    (win) => win.appId === APP.EDITOR && win.phase !== WINDOW_PHASES.CLOSING && (win.arg === path || win.arg?.startsWith(`${path}/`)),
  )

/**
 * Closes each window in turn, then runs `next`. Each close can ask to save first, and cancelling one stops the
 * rest, so nothing is trashed under an editor still open.
 */
const closeThen = (windowManager, wins, next) => {
  if (!wins.length) {
    next()
    return
  }
  windowManager.close(wins[0].id, () => closeThen(windowManager, wins.slice(1), next))
}

/** Trash and Restore for one path, or neither when it shipped with rafeyOS. A trashed folder can't be opened. */
export const useTrashActions = () => {
  const { vfs, trashDocument, restoreDocument } = useVfs()
  const windows = useWindowsState()
  const windowManager = useWindowManager()
  const notify = useNotify()
  return useCallback((path) => {
    const node = vfs[path]
    if (node?.trashedFrom) {
      return {
        // Nothing inside a trashed folder can be reached, so it neither opens nor has a terminal
        ...(node.type === NODE_TYPES.DIR ? { open: null, openTerminal: null } : {}),
        restore: () => {
          const result = restoreDocument(node.trashedFrom)
          if (result.ok) return
          const blocked = result.reason === 'taken'
          const folder = placeLabel(parentOf(node.trashedFrom))
          notify({
            appId: APP.FILES,
            title: blocked ? `Can't restore ${node.name}` : "Couldn't restore",
            body: blocked
              ? `A ${node.type === NODE_TYPES.DIR ? 'folder' : 'file'} named ${node.name} is already in ${folder}.`
              : reasonBody(result.reason),
          })
        },
      }
    }
    if (!isVisitorItem(vfs, path)) return {}
    const trash = () => reportFailure(notify, "Couldn't move to Trash", trashDocument(path))
    return { trash: () => closeThen(windowManager, openEditors(windows, path), trash) }
  }, [vfs, windows, windowManager, trashDocument, restoreDocument, notify])
}
