// rafeyOS with its dependencies injected; RafeyOS.jsx wires in the real browser services
import { useCallback, useMemo, useRef, useState } from 'react'
import { ServicesContext, VfsContext } from './state/logic/contexts'
import { buildContent } from './vfs/content'
import { buildVfs } from './vfs/buildVfs'
import { asDocuments, documentName, emptyTrash, filePath, isSaveFolder, mergeDocuments, moveToTrash, restoreFromTrash } from './vfs/documents'
import { SessionGate } from './session/SessionGate'

/** @param {{ services: object }} props - see services/createServices.js */
export const RafeyOSRoot = ({ services }) => {
  const content = useMemo(() => buildContent(), [])
  const base = useMemo(() => buildVfs(content), [content])
  const [docs, setDocs] = useState(() => asDocuments(services.documents.load()))
  const docsRef = useRef(docs)
  const commit = useCallback((next) => {
    if (!services.documents.save(next)) return false
    docsRef.current = next
    setDocs(next)
    return true
  }, [services])
  const saveDocument = useCallback((folder, name, text) => {
    const checked = documentName(name)
    if (!checked.ok || !isSaveFolder(folder)) return { ok: false, reason: 'invalid' }
    const path = filePath(folder, checked.name)
    if (base[path]) return { ok: false, reason: 'taken' }
    const next = { ...docsRef.current, files: { ...docsRef.current.files, [path]: String(text) } }
    if (!commit(next)) return { ok: false, reason: 'write' }
    return { ok: true, name: checked.name, path }
  }, [base, commit])
  const trashDocument = useCallback((path) => {
    const next = moveToTrash(docsRef.current, path)
    if (!next || !commit(next)) return { ok: false, reason: next ? 'write' : 'missing' }
    return { ok: true }
  }, [commit])
  const emptyTrashDocument = useCallback(() => {
    const next = emptyTrash(docsRef.current)
    if (!next || !commit(next)) return { ok: false, reason: next ? 'write' : 'empty' }
    return { ok: true }
  }, [commit])
  const restoreDocument = useCallback((path) => {
    const result = restoreFromTrash(docsRef.current, path, Object.keys(base))
    if (!result.ok || !commit(result.state)) return { ok: false, reason: result.ok ? 'write' : result.reason }
    return { ok: true, path }
  }, [base, commit])
  const vfsValue = useMemo(
    () => Object.freeze({
      content,
      vfs: mergeDocuments(base, docs.files, docs.trash),
      saveDocument,
      trashDocument,
      restoreDocument,
      emptyTrashDocument,
    }),
    [content, base, docs, saveDocument, trashDocument, restoreDocument, emptyTrashDocument],
  )
  return (
    <ServicesContext.Provider value={services}>
      <VfsContext.Provider value={vfsValue}>
        <SessionGate />
      </VfsContext.Provider>
    </ServicesContext.Provider>
  )
}
