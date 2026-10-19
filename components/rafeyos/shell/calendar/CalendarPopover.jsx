import { useCallback, useState } from 'react'
import { useMusic, useMusicControls, useSettings, useSettingsDispatch, useShellDispatch, useVfs } from '@/components/rafeyos/state/logic/contexts'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { AppIcon } from '@/components/rafeyos/ui/icons/appIcons'
import { calendarGrid } from './logic/calendarGrid'
import { Switch } from '@/components/rafeyos/ui/controls/Switch'
import { useEscapeKey } from '@/components/rafeyos/shell/logic/useEscapeKey'
import { useNow } from '@/components/rafeyos/shell/logic/useNow'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { KEEPS_POPUP_PROPS } from '@/components/rafeyos/ui/logic/domHooks'
import { SETTINGS_ACTIONS } from '@/components/rafeyos/state/logic/settingsReducer'
import { APP } from '@/components/rafeyos/core/catalog/apps'

const WEEKDAY_LETTERS = Object.freeze(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
// The mockup keeps Clear visible but inert: there are never notifications to clear
const CLEAR_STYLE = Object.freeze({ opacity: 0.45, background: '#3d3d3d', color: '#fff' })

const firstOfMonth = (date) => ({ year: date.getFullYear(), month: date.getMonth() })

const shiftMonth = ({ year, month }, delta) => firstOfMonth(new Date(year, month + delta, 1))

/** "October", or "January 2027" once the grid leaves the current year (as GNOME does). */
export const monthLabel = ({ year, month }, today) =>
  new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: year === today.getFullYear() ? undefined : 'numeric',
  })

/** Shown once the track has played: GNOME's media controls in the notification list. */
const MediaCard = () => {
  const { playing } = useMusic()
  const music = useMusicControls()
  const { track } = useVfs().content.music
  return (
    <div className="media">
      <AppIcon name={APP.MUSIC} className="ai" />
      <b>{track.title}</b>
      <small>{track.artist}</small>
      <div className="mc">
        <button type="button" aria-label="Previous" onClick={music.prev}>
          <Sym name="prev" />
        </button>
        <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={music.toggle}>
          <Sym name={playing ? 'pause' : 'play'} />
        </button>
        <button type="button" aria-label="Next" onClick={music.next}>
          <Sym name="next" />
        </button>
      </div>
    </div>
  )
}

const Notifications = () => {
  const { played } = useMusic()
  const { dnd } = useSettings()
  const settingsDispatch = useSettingsDispatch()
  return (
    <div className="cal-l">
      {played && <MediaCard />}
      <div className="cal-empty">
        <Sym name="bell" />
        <span>No Notifications</span>
      </div>
      <div className="cal-foot">
        <span>Do Not Disturb</span>
        <Switch on={dnd} label="Do Not Disturb" onToggle={() => settingsDispatch({ type: SETTINGS_ACTIONS.TOGGLE, key: 'dnd' })} />
        <span className="sp" />
        <button type="button" className="btn pill" disabled style={CLEAR_STYLE}>
          Clear
        </button>
      </div>
    </div>
  )
}

const MonthGrid = ({ today }) => {
  const [shown, setShown] = useState(() => firstOfMonth(today))
  const cells = calendarGrid(shown.year, shown.month, today)
  return (
    <div className="cal-box">
      <div className="cal-mh">
        <button type="button" aria-label="Previous month" onClick={() => setShown((current) => shiftMonth(current, -1))}>
          <Sym name="back" />
        </button>
        <span>{monthLabel(shown, today)}</span>
        <button type="button" aria-label="Next month" onClick={() => setShown((current) => shiftMonth(current, 1))}>
          <Sym name="fwd" />
        </button>
      </div>
      <div className="cal-g">
        {WEEKDAY_LETTERS.map((letter, i) => (
          <div key={`wd-${i}`} className="wd">
            {letter}
          </div>
        ))}
        {cells.map((cell, i) => (
          <span key={`d-${i}`} className={cell.isToday ? 'today' : cell.inMonth ? undefined : 'oth'}>
            {cell.day}
          </span>
        ))}
      </div>
    </div>
  )
}

/** The clock's popover: notifications (and the media card) on the left, the date and month on the right. */
export const CalendarPopover = () => {
  const today = useNow()
  const shellDispatch = useShellDispatch()
  useEscapeKey(useCallback(() => shellDispatch({ type: SHELL_ACTIONS.CLOSE_POPUP }), [shellDispatch]))
  return (
    <div className="cal" {...KEEPS_POPUP_PROPS} role="dialog" aria-label="Calendar and notifications">
      <Notifications />
      <div className="cal-r">
        <div>
          <div className="dn">{today.toLocaleDateString('en-US', { weekday: 'long' })}</div>
          <div className="dd">{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <MonthGrid today={today} />
        <div className="cal-ev">
          <b>Today</b>
          <small>No Events</small>
        </div>
      </div>
    </div>
  )
}
