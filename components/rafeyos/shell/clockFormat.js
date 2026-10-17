/** "21:04": 24-hour, as GNOME shows it. */
export const formatTime = (date) => date.toTimeString().slice(0, 5)

/** GNOME's top-bar clock: "Oct 17  21:04" (24-hour, month and day in en-US). */
export const formatClock = (date) =>
  `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}  ${formatTime(date)}`

/** The lock screen's date: "Saturday, October 17". */
export const formatLongDate = (date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
