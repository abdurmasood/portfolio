import { useCallback, useState } from 'react'
import { useSessionDispatch, useShellDispatch } from '@/components/rafeyos/state/logic/contexts'
import { SESSION_EVENTS } from '@/components/rafeyos/state/logic/sessionMachine'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { useOpenSettings } from './logic/useOpenSettings'
import { SETTINGS_PAGES } from '@/components/rafeyos/core/catalog/settingsPages'
import { QuickToggles, QuickVolume } from './QuickToggles'
import { useEscapeKey } from './logic/useEscapeKey'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'

// Screenshot isn't built: shown as in the mockup, but inert
const DISABLED = { opacity: 0.5 }

const PowerMenu = ({ onDialog, onSession }) => (
  <div className="qs-power">
    <button type="button" className="mi" onClick={() => onSession(SESSION_EVENTS.SUSPEND)}>
      Suspend
    </button>
    <button type="button" className="mi" onClick={() => onDialog('restart')}>
      Restart…
    </button>
    <button type="button" className="mi" onClick={() => onDialog('poweroff')}>
      Power Off…
    </button>
    <div className="msep" style={{ background: 'rgba(255,255,255,.1)' }} />
    <button type="button" className="mi" onClick={() => onDialog('logout')}>
      Log Out…
    </button>
  </div>
)

/** The top row, the power submenu, the volume slider and the toggle tiles. */
export const QuickSettings = () => {
  const shellDispatch = useShellDispatch()
  const sessionDispatch = useSessionDispatch()
  const openSettings = useOpenSettings()
  const [powerOpen, setPowerOpen] = useState(false)
  useEscapeKey(useCallback(() => shellDispatch({ type: SHELL_ACTIONS.CLOSE_POPUP }), [shellDispatch]))
  const openDialog = (kind) => shellDispatch({ type: SHELL_ACTIONS.OPEN_DIALOG, kind })
  const sendSession = (event) => {
    shellDispatch({ type: SHELL_ACTIONS.CLOSE_TRANSIENTS })
    sessionDispatch(event)
  }
  return (
    <div className="qs" role="dialog" aria-label="Quick settings">
      <div className="qs-top">
        <button type="button" className="qs-ic" aria-label="Take Screenshot" disabled style={DISABLED}>
          <Sym name="camera" />
        </button>
        <button type="button" className="qs-ic" aria-label="Settings" onClick={() => openSettings(SETTINGS_PAGES.APPEARANCE)}>
          <Sym name="gear" />
        </button>
        <button type="button" className="qs-ic" aria-label="Lock" onClick={() => sendSession(SESSION_EVENTS.LOCK)}>
          <Sym name="lock" />
        </button>
        <button
          type="button"
          className="qs-ic"
          aria-label="Power Off / Log Out"
          aria-expanded={powerOpen}
          onClick={() => setPowerOpen((open) => !open)}
        >
          <Sym name="power" />
        </button>
      </div>
      {powerOpen && <PowerMenu onDialog={openDialog} onSession={sendSession} />}
      <QuickVolume />
      <QuickToggles />
    </div>
  )
}
