import { formatClock } from './logic/clockFormat'
import { useNow } from '@/components/rafeyos/shell/logic/useNow'

/** Owns its tick so the clock re-renders only this span. */
export const Clock = () => <span className="clock">{formatClock(useNow())}</span>
