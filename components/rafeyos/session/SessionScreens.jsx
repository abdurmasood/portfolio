// Lock and suspend: drawn over the live desktop, so every window is still there afterwards.
import { useEffect } from 'react'
import { useSettings } from '../state/contexts'
import { WALLS } from '../theme/walls'
import { formatClock, formatLongDate, formatTime } from '../shell/chrome/js/clockFormat'
import { useNow } from '../shell/chrome/js/useNow'
import { StatusIcons } from '../shell/chrome/TopBar'

// The mockup waits this long before listening for keys, so the key that locked can't unlock
export const UNLOCK_KEY_DELAY_MS = 50

const NO_POINTER = { pointerEvents: 'none' }

/** Typing behind the lock screen would reach whatever had focus. */
const blurActiveElement = () => document.activeElement?.blur?.()

const useUnlockOnKey = (onUnlock) => {
  useEffect(() => {
    blurActiveElement()
    const timer = setTimeout(() => window.addEventListener('keydown', onUnlock), UNLOCK_KEY_DELAY_MS)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onUnlock)
    }
  }, [onUnlock])
}

const MiniTopBar = ({ now }) => (
  <div className="topbar" style={{ position: 'absolute' }}>
    <div className="tb-l" />
    <div className="tb-c">
      <span className="tbb" style={NO_POINTER}>
        {formatClock(now)}
      </span>
    </div>
    <div className="tb-r">
      <span className="tbb" style={NO_POINTER}>
        <StatusIcons />
      </span>
    </div>
  </div>
)

/** GNOME's lock screen without a password: a click or any key goes straight back. */
export const LockScreen = ({ onUnlock }) => {
  const { wall } = useSettings()
  const now = useNow()
  useUnlockOnKey(onUnlock)
  return (
    <div className="scr lock" role="dialog" aria-label="Locked" onClick={onUnlock}>
      <div className="lockbg" style={{ background: (WALLS[wall] ?? WALLS[0]).css }} />
      <MiniTopBar now={now} />
      <div className="lockclk">
        <div className="t">{formatTime(now)}</div>
        <div className="d">{formatLongDate(now)}</div>
      </div>
      <div className="lockhint">Click or press a key to unlock</div>
    </div>
  )
}

export const SuspendScreen = ({ onWake }) => (
  <div className="scr off" role="dialog" aria-label="Suspended" onClick={onWake}>
    <small>Suspended. Click to wake.</small>
  </div>
)
