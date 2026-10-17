import { describe, it, expect } from 'vitest'
import { calendarGrid } from './calendarGrid'

describe('calendarGrid', () => {
  it('returns 42 cells starting on Sunday, padded with neighbouring months', () => {
    // October 2026 starts on a Thursday
    const cells = calendarGrid(2026, 9, new Date(2026, 9, 17))

    expect(cells).toHaveLength(42)
    expect(cells.slice(0, 4)).toEqual([27, 28, 29, 30].map((day) => ({ day, inMonth: false, isToday: false })))
    expect(cells[4]).toEqual({ day: 1, inMonth: true, isToday: false })
    expect(cells[34]).toEqual({ day: 31, inMonth: true, isToday: false })
    expect(cells[35]).toEqual({ day: 1, inMonth: false, isToday: false })
    expect(cells[41].day).toBe(7)
  })

  it('marks only today', () => {
    const cells = calendarGrid(2026, 9, new Date(2026, 9, 17, 15, 30))

    expect(cells.filter((c) => c.isToday)).toEqual([{ day: 17, inMonth: true, isToday: true }])
  })

  it('marks nothing when today is in another month or year', () => {
    expect(calendarGrid(2026, 10, new Date(2026, 9, 17)).some((c) => c.isToday)).toBe(false)
    expect(calendarGrid(2025, 9, new Date(2026, 9, 17)).some((c) => c.isToday)).toBe(false)
    expect(calendarGrid(2026, 9, null).some((c) => c.isToday)).toBe(false)
  })

  it('handles a month starting on Sunday and leap Februaries', () => {
    // February 2032 starts on a Sunday and has 29 days
    const cells = calendarGrid(2032, 1, new Date(2032, 1, 29))

    expect(cells[0]).toEqual({ day: 1, inMonth: true, isToday: false })
    expect(cells[28]).toEqual({ day: 29, inMonth: true, isToday: true })
    expect(cells[29]).toEqual({ day: 1, inMonth: false, isToday: false })
  })
})
