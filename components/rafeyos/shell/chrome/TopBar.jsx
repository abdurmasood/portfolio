import { useShellDispatch, useShellState } from '@/components/rafeyos/state/logic/contexts'
import { StatusIcons } from '@/components/rafeyos/ui/icons/StatusIcons'
import { Clock } from './Clock'
import { OVERVIEW_MODES } from '@/components/rafeyos/wm/logic/overviewModel'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { CALENDAR_POPUP, QUICK_SETTINGS_POPUP } from '@/components/rafeyos/shell/logic/shellIds'

/** Activities (workspace dots), the clock (calendar), and the status area that opens Quick Settings. */
export const TopBar = () => {
  const shell = useShellState()
  const shellDispatch = useShellDispatch()
  const quickSettingsOpen = shell.popup?.kind === QUICK_SETTINGS_POPUP
  const calendarOpen = shell.popup?.kind === CALENDAR_POPUP
  return (
    <div className="topbar">
      <div className="tb-l">
        <button
          type="button"
          className="tbb"
          aria-label="Activities"
          aria-pressed={shell.overview !== null}
          onClick={() =>
            shellDispatch(shell.overview ? { type: SHELL_ACTIONS.CLOSE_OVERVIEW } : { type: SHELL_ACTIONS.OPEN_OVERVIEW, mode: OVERVIEW_MODES.WINDOWS })
          }
        >
          <span className="wsi">
            <i className="on" />
            <i />
          </span>
        </button>
      </div>
      <div className="tb-c">
        <button
          type="button"
          className={calendarOpen ? 'tbb open' : 'tbb'}
          data-tb="cal"
          aria-label="Date and time"
          aria-expanded={calendarOpen}
          onClick={() => shellDispatch({ type: SHELL_ACTIONS.TOGGLE_POPUP, kind: CALENDAR_POPUP })}
        >
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
          onClick={() => shellDispatch({ type: SHELL_ACTIONS.TOGGLE_POPUP, kind: QUICK_SETTINGS_POPUP })}
        >
          <StatusIcons />
        </button>
      </div>
    </div>
  )
}
