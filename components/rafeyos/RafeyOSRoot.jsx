// rafeyOS with its dependencies injected; RafeyOS.jsx wires in the real browser services
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { ServicesContext, VfsContext } from './state/logic/contexts'
import { buildContent } from '@/components/rafeyos/core/vfs/content'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { mkdir, rename } from '@/components/rafeyos/core/vfs/fsOps'
import { mergeState } from '@/components/rafeyos/core/vfs/fsState'
import { joinPath } from '@/components/rafeyos/core/vfs/paths'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { SessionGate } from './session/SessionGate'

/** A failed store or fsOps result as the GUI sees it: only the reason (an fsOps errno), never the state. */
const failure = (result) => ({ ok: false, reason: result.errno ?? result.reason })

/** @param {{ services: object }} props - see services/createServices.js */
export const RafeyOSRoot = ({ services }) => {
  const { fs } = services
  const content = useMemo(() => buildContent(), [])
  const base = useMemo(() => buildVfs(content), [content])
  const state = useSyncExternalStore(fs.subscribe, fs.getState, fs.getState)
  const vfs = useMemo(() => mergeState(base, state), [base, state])
  // The terminal's way in: reads the store's latest state itself, so it never waits on a render
  const shellFs = useMemo(() => createShellFs({ base, store: fs }), [base, fs])
  // In place: Save on the visitor's own file, written back at folder/name exactly as it is
  const saveDocument = useCallback((folder, name, text, { inPlace = false } = {}) => {
    const result = inPlace ? fs.saveInPlace(joinPath(folder, name), text) : fs.saveFile(folder, name, text)
    return result.ok ? { ok: true, name: result.name, path: result.path } : failure(result)
  }, [fs])
  const trashDocument = useCallback((path) => {
    const result = fs.moveToTrash(path)
    return result.ok ? { ok: true } : failure(result)
  }, [fs])
  const emptyTrashDocument = useCallback(() => {
    const result = fs.emptyTrash()
    return result.ok ? { ok: true } : failure(result)
  }, [fs])
  const restoreDocument = useCallback((path) => {
    const result = fs.restoreFromTrash(path)
    return result.ok ? { ok: true, path } : failure(result)
  }, [fs])
  // Files' New Folder and Rename: the shell's mkdir and a mv that never replaces, so both follow its rules
  const createFolder = useCallback((path) => {
    const result = shellFs.apply(mkdir, { path })
    return result.ok ? { ok: true, path } : failure(result)
  }, [shellFs])
  const renamePath = useCallback((from, to) => {
    const result = shellFs.apply(rename, { from, to })
    return result.ok ? { ok: true, path: to } : failure(result)
  }, [shellFs])
  const vfsValue = useMemo(
    () => Object.freeze({
      content, vfs, shellFs, saveDocument, trashDocument, restoreDocument, emptyTrashDocument, createFolder, renamePath,
    }),
    [content, vfs, shellFs, saveDocument, trashDocument, restoreDocument, emptyTrashDocument, createFolder, renamePath],
  )
  return (
    <ServicesContext.Provider value={services}>
      <VfsContext.Provider value={vfsValue}>
        <SessionGate />
      </VfsContext.Provider>
    </ServicesContext.Provider>
  )
}
