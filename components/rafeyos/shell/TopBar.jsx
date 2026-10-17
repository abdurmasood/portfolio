import { useSettings, useShellDispatch, useShellState } from '../state/contexts'
import { Sym } from '../icons/symbols'
import { Clock } from './Clock'

const QUICK_SETTINGS = 'qs'

const StatusIcons = () => {
  const { wifi, volume } = useSettings()
  return (
    <span className="sti">
      <Sym name={wifi ? 'wifi' : 'wifioff'} />
      <Sym name={volume === 0 ? 'vol0' : 'vol'} />
      <Sym name="power" />
    </span>
  )
}

/** Activities (workspace dots), the clock, and the status area that opens Quick Settings. */
export const TopBar = () => {
  const shell = useShellState()
  const shellDispatch = useShellDispatch()
  const quickSettingsOpen = shell.popup?.kind === QUICK_SETTINGS
  return (
    <div className="topbar">
      <div className="tb-l">
        {/* The Activities overview arrives in P4 */}
        <button type="button" className="tbb" aria-label="Activities">
          <span className="wsi">
            <i className="on" />
            <i />
          </span>
        </button>
      </div>
      <div className="tb-c">
        <button type="button" className="tbb" aria-label="Date and time">
          <Clock />
        </button>
      </div>
      <div className="tb-r">
        <button
          type="button"
          className={quickSettingsOpen ? 'tbb open' : 'tbb'}
          data-tb="qs"
          aria-label="System menu"
          aria-expanded={quickSettingsOpen}
          onClick={() => shellDispatch({ type: 'togglePopup', kind: QUICK_SETTINGS })}
        >
          <StatusIcons />
        </button>
      </div>
    </div>
  )
}
