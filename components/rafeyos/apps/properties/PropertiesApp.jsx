import { useEffect, useMemo } from 'react'
import { useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { FileIcon } from '@/components/rafeyos/ui/icons/FileIcon'
import { realPath } from '@/components/rafeyos/core/vfs/paths'
import { displayName, isDir } from '@/components/rafeyos/core/vfs/queries'
import { propertiesRows } from './logic/propertiesRows'
import { APP } from '@/components/rafeyos/core/catalog/apps'

export const propertiesTitle = (name) => `${name} Properties`

/** One path's Properties: icon, name, a boxed list of facts, and a terminal for folders. */
export const PropertiesApp = ({ windowId, arg }) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const name = displayName(vfs, arg)
  const rows = useMemo(() => propertiesRows(vfs, arg), [vfs, arg])
  useEffect(() => windowManager.setTitle(windowId, propertiesTitle(name)), [windowManager, windowId, name])
  const openTerminal = () => windowManager.openApp(APP.TERMINAL, { path: realPath(vfs, arg) })
  return (
    <>
      <HeaderBar title="Properties" />
      <div className="scroll">
        <div className="props">
          <FileIcon vfs={vfs} path={arg} />
          <div className="pn seltext">{name}</div>
          <div className="boxed">
            {rows.map((row) => (
              <div key={row.label} className="row">
                <span className="rt">{row.label}</span>
                <span className="rv seltext">{row.value}</span>
              </div>
            ))}
          </div>
          {isDir(vfs, arg) && (
            <button type="button" className="btn" onClick={openTerminal}>
              Open in Terminal
            </button>
          )}
        </div>
      </div>
    </>
  )
}
