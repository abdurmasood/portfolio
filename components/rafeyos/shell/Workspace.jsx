import { useCallback, useState } from 'react'
import { useSettings, useShellDispatch, useWindowManager } from '../state/contexts'
import { WALLS } from '../theme/walls'
import { DesktopIcons } from './DesktopIcons'

/** Wallpaper plus desktop icons; a press on the wallpaper clears the selection and unfocuses windows. */
export const Workspace = () => {
  const { wall } = useSettings()
  const windowManager = useWindowManager()
  const shellDispatch = useShellDispatch()
  const [selection, setSelection] = useState([])
  const clearDesktop = useCallback(
    (event) => {
      if (event.button !== 0) return
      shellDispatch({ type: 'closeTransients' })
      windowManager.focus(null)
      setSelection([])
    },
    [shellDispatch, windowManager],
  )
  return (
    <>
      <div className="wall" style={{ background: (WALLS[wall] ?? WALLS[0]).css }} onPointerDown={clearDesktop} data-testid="wallpaper" />
      <DesktopIcons selection={selection} onSelect={setSelection} />
    </>
  )
}
