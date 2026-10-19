import { useShellDispatch, useShellState, useSettings, useLayout } from '@/components/rafeyos/state/logic/contexts'
import { Workspace } from './desktop/Workspace'
import { WindowLayer } from '@/components/rafeyos/wm/WindowLayer'
import { TopBar } from './chrome/TopBar'
import { Dock } from './chrome/Dock'
import { ShellLayer } from './ShellLayer'
import { OverviewStage } from './overview/Overview'
import { spreadsWindows } from '@/components/rafeyos/wm/logic/overviewModel'
import { useGlobalKeys } from './chrome/logic/useGlobalKeys'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'

// Presses inside these keep the open popup; anywhere else closes it
const KEEPS_POPUP = '.pop, .shm, .qs, .cal, [data-tb], .modal'

const preventContextMenu = (event) => event.preventDefault()

/** Night Light: a warm multiply wash over everything, fading in and out (mockup .night). */
const NightLight = () => {
  const { night } = useSettings()
  return <div className={night ? 'night on' : 'night'} data-testid="night-light" aria-hidden="true" />
}

/** ov: the Activities overview is open; ovhide: it shows the app grid or search, not the windows. */
const frameClassName = ({ style, overview, compact }) =>
  [
    'rafeyos',
    style === 'light' && 'light',
    overview && 'ov',
    overview && !spreadsWindows(overview) && 'ovhide',
    compact && 'compact',
  ]
    .filter(Boolean)
    .join(' ')

/** The .rafeyos root: theme class, accent and icon size. Children pass through without re-rendering. */
const DesktopFrame = ({ children }) => {
  const { style, accent } = useSettings()
  const { iconSize, compact } = useLayout()
  const shell = useShellState()
  const shellDispatch = useShellDispatch()
  const closeOutside = (event) => {
    if (!shell.popup && !shell.menu) return
    if (!event.target.closest(KEEPS_POPUP)) shellDispatch({ type: SHELL_ACTIONS.CLOSE_TRANSIENTS })
  }
  return (
    <div
      className={frameClassName({ style, overview: shell.overview, compact })}
      style={{ '--accent': accent, '--icon': `${iconSize}px` }}
      onContextMenu={preventContextMenu}
      onPointerDownCapture={closeOutside}
    >
      {children}
    </div>
  )
}

/** Meta, Ctrl+Alt+T and Esc, only while the desktop itself is showing (not locked or suspended). */
const GlobalKeys = ({ active }) => {
  useGlobalKeys(active)
  return null
}

/**
 * @param {{ overlay?: JSX.Element|null, active?: boolean }} props - overlay: the lock or suspend
 *   screen, drawn over everything; active: the session is on the desktop, so global keys apply
 */
export const Desktop = ({ overlay = null, active = false }) => (
  <DesktopFrame>
    <GlobalKeys active={active} />
    <OverviewStage>
      <Workspace />
      <WindowLayer />
    </OverviewStage>
    <TopBar />
    <Dock />
    <ShellLayer />
    <NightLight />
    {overlay}
  </DesktopFrame>
)
