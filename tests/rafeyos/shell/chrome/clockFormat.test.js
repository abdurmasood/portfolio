import { describe, expect, it } from 'vitest'
import { formatClock, formatLongDate, formatTime } from '@/components/rafeyos/shell/chrome/js/clockFormat'

describe('clockFormat', () => {
  it('formats the clock like GNOME', () => {
    expect(formatClock(new Date(2026, 9, 7, 9, 5))).toBe('Oct 7  09:05')
    expect(formatTime(new Date(2026, 9, 7, 9, 5))).toBe('09:05')
    expect(formatLongDate(new Date(2026, 9, 7, 9, 5))).toBe('Wednesday, October 7')
  })
})
