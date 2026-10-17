import { useState } from 'react'
import { useShellDispatch } from '../state/contexts'
import { Sym } from '../icons/symbols'

// Not built yet (P2): shown as in the mockup, but inert
const DISABLED = { opacity: 0.5 }

const PowerMenu = ({ onChoose }) => (
  <div className="qs-power">
    <button type="button" className="mi" disabled>
      Suspend
    </button>
    <button type="button" className="mi" disabled>
      Restart…
    </button>
    <button type="button" className="mi" onClick={() => onChoose('poweroff')}>
      Power Off…
    </button>
    <div className="msep" style={{ background: 'rgba(255,255,255,.1)' }} />
    <button type="button" className="mi" onClick={() => onChoose('logout')}>
      Log Out…
    </button>
  </div>
)

/** P1 subset: the top row and the power submenu. Toggles and the volume slider come in P3. */
export const QuickSettings = () => {
  const shellDispatch = useShellDispatch()
  const [powerOpen, setPowerOpen] = useState(false)
  const openDialog = (kind) => shellDispatch({ type: 'openDialog', kind })
  return (
    <div className="qs" role="dialog" aria-label="Quick settings">
      <div className="qs-top">
        <button type="button" className="qs-ic" aria-label="Take Screenshot" disabled style={DISABLED}>
          <Sym name="camera" />
        </button>
        <button type="button" className="qs-ic" aria-label="Settings" disabled style={DISABLED}>
          <Sym name="gear" />
        </button>
        <button type="button" className="qs-ic" aria-label="Lock" disabled style={DISABLED}>
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
      {powerOpen && <PowerMenu onChoose={openDialog} />}
    </div>
  )
}
