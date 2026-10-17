// rafeyOS with its dependencies injected; RafeyOS.jsx wires in the real browser services
import { useMemo } from 'react'
import { ServicesContext, VfsContext } from './state/contexts'
import { buildContent } from './vfs/content'
import { buildVfs } from './vfs/buildVfs'
import { SessionGate } from './session/SessionGate'

/** @param {{ services: object }} props - see services/createServices.js */
export const RafeyOSRoot = ({ services }) => {
  const vfsValue = useMemo(() => {
    const content = buildContent()
    return Object.freeze({ content, vfs: buildVfs(content) })
  }, [])
  return (
    <ServicesContext.Provider value={services}>
      <VfsContext.Provider value={vfsValue}>
        <SessionGate />
      </VfsContext.Provider>
    </ServicesContext.Provider>
  )
}
