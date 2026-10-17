import { formatClock } from './clockFormat'
import { useNow } from './useNow'

/** Owns its tick so the clock re-renders only this span. */
export const Clock = () => <span className="clock">{formatClock(useNow())}</span>
