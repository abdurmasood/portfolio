const CELLS = 42

const sameDay = (a, year, month, day) =>
  Boolean(a) && a.getFullYear() === year && a.getMonth() === month && a.getDate() === day

/**
 * Six weeks starting on Sunday, padded with the neighbouring months' days.
 * @param {number} year
 * @param {number} month - 0-based, like Date#getMonth
 * @param {Date} today
 * @returns {{ day: number, inMonth: boolean, isToday: boolean }[]} 42 cells
 */
export const calendarGrid = (year, month, today) => {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: CELLS }, (_, i) => {
    const day = i - firstWeekday + 1
    if (day < 1) return { day: daysInPrevMonth + day, inMonth: false, isToday: false }
    if (day > daysInMonth) return { day: day - daysInMonth, inMonth: false, isToday: false }
    return { day, inMonth: true, isToday: sameDay(today, year, month, day) }
  })
}
