import { useShellDispatch, useShellState, useSettings, useLayout } from '../state/contexts'
import { Workspace } from './Workspace'
import { WindowLayer } from '../wm/WindowLayer'
import { TopBar } from './TopBar'
import { Dock } from './Dock'
import { ShellLayer } from './ShellLayer'

// Presses inside these keep the open popup; anywhere else closes it
const KEEPS_POPUP = '.pop, .shm, .qs, .cal, [data-tb], .modal'

const preventContextMenu = (event) => event.preventDefault()

/** The .rafeyos root: theme class, accent and icon size. Children pass through without re-rendering. */
const DesktopFrame = ({ children }) => {
  const { style, accent } = useSettings()
  const { iconSize } = useLayout()
  const shell = useShellState()
  const shellDispatch = useShellDispatch()
  const closeOutside = (event) => {
    if (!shell.popup && !shell.menu) return
    if (!event.target.closest(KEEPS_POPUP)) shellDispatch({ type: 'closeTransients' })
  }
  return (
    <div
      className={style === 'light' ? 'rafeyos light' : 'rafeyos'}
      style={{ '--accent': accent, '--icon': `${iconSize}px` }}
      onContextMenu={preventContextMenu}
      onPointerDownCapture={closeOutside}
    >
      {children}
    </div>
  )
}

export const Desktop = () => (
  <DesktopFrame>
    <div className="ws">
      <Workspace />
      <WindowLayer />
    </div>
    <TopBar />
    <Dock />
    <ShellLayer />
  </DesktopFrame>
)
