import { formatClock } from './js/clockFormat'
import { useNow } from './js/useNow'

/** Owns its tick so the clock re-renders only this span. */
export const Clock = () => <span className="clock">{formatClock(useNow())}</span>
