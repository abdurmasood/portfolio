import { useCallback } from 'react'
import { useShellDispatch, useVfs, useWindowManager, useWindowsState } from '@/components/rafeyos/state/logic/contexts'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { WINDOW_PHASES } from '@/components/rafeyos/state/logic/windowsReducer'
import { useLatest } from '@/components/rafeyos/state/logic/useLatest'
import { useNotify } from '@/components/rafeyos/state/logic/useNotify'
import { NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath, parentOf } from '@/components/rafeyos/core/vfs/paths'
import { APP } from '@/components/rafeyos/core/catalog/apps'
import { NAME_POPUP } from '@/components/rafeyos/ui/popups/NamePopover'
import { isStorageFailure, reasonBody } from './storageFailure'
import { canCreateIn, isVisitorItem } from './visitorItems'

const UNTITLED_FOLDER = 'Untitled Folder'
// Another tab took the name after the popover checked it, so which kind holds it isn't known here
const TAKEN = 'A file or folder with that name already exists.'

/**
 * What the popover shows for a failed change: TAKEN in place, or nothing, closing it. A refused write tells the visitor
 * in a notification, as Trash does; anything else means another tab changed the files first, which needs no message.
 */
const refusalOf = (result, notify, title) => {
  if (result.ok) return null
  if (result.reason === 'EEXIST') return TAKEN
  if (isStorageFailure(result.reason)) notify({ appId: APP.FILES, title, body: reasonBody(result.reason) })
  return null
}

/** Editor windows on `from` or on a file inside it now show it at `to`. */
const followRename = (windows, windowManager, from, to) => {
  Object.values(windows.byId).forEach((win) => {
    if (win.appId !== APP.EDITOR || win.phase === WINDOW_PHASES.CLOSING || !win.arg) return
    if (win.arg === from || win.arg.startsWith(`${from}/`)) windowManager.setArg(win.id, to + win.arg.slice(from.length))
  })
}

/**
 * New Folder and Rename, each asking for the name in the popover at `anchor` (a rect, or a point as a rect with no
 * size). Each returns the menu's command, or null where it doesn't apply, so the item shows disabled.
 */
export const useNameActions = () => {
  const { vfs, createFolder, renamePath } = useVfs()
  const windowsRef = useLatest(useWindowsState())
  const windowManager = useWindowManager()
  const notify = useNotify()
  const shellDispatch = useShellDispatch()
  const ask = useCallback(
    (anchor, prompt) => shellDispatch({ type: SHELL_ACTIONS.OPEN_POPUP, kind: NAME_POPUP, anchor, prompt }),
    [shellDispatch],
  )
  /** @param {string} folder @param {object} anchor @param {(path: string) => void} [onCreated] */
  const newFolderIn = useCallback((folder, anchor, onCreated) => {
    if (!canCreateIn(vfs, folder)) return null
    const onSubmit = (name) => {
      const result = createFolder(joinPath(folder, name))
      if (result.ok) onCreated?.(result.path)
      return refusalOf(result, notify, "Couldn't create folder")
    }
    return () => ask(anchor, { title: 'New Folder', actionLabel: 'Create', initial: UNTITLED_FOLDER, isFolder: true, folder, original: null, onSubmit })
  }, [vfs, createFolder, notify, ask])
  /** @param {string} path @param {object} anchor @param {(from: string, to: string) => void} [onRenamed] */
  const renameFor = useCallback((path, anchor, onRenamed) => {
    if (!isVisitorItem(vfs, path)) return null
    const isFolder = vfs[path].type === NODE_TYPES.DIR
    const folder = parentOf(path)
    const onSubmit = (name) => {
      const to = joinPath(folder, name)
      const result = renamePath(path, to)
      if (result.ok && to !== path) {
        followRename(windowsRef.current, windowManager, path, to)
        onRenamed?.(path, to)
      }
      return refusalOf(result, notify, "Couldn't rename")
    }
    const title = isFolder ? 'Rename Folder' : 'Rename File'
    return () => ask(anchor, { title, actionLabel: 'Rename', initial: vfs[path].name, isFolder, folder, original: path, onSubmit })
  }, [vfs, renamePath, windowsRef, windowManager, notify, ask])
  return { newFolderIn, renameFor }
}
