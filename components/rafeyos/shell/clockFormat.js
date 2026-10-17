/** GNOME's top-bar clock: "Oct 17  21:04" (24-hour, month and day in en-US). */
export const formatClock = (date) =>
  `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}  ${date.toTimeString().slice(0, 5)}`
