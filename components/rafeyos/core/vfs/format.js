// Decimal units, as GNOME Files shows them (1 kB = 1000 bytes)
const KILO = 1000
const MEGA = 1000 * 1000

export const humanBytes = (bytes) => {
  if (bytes < KILO) return `${bytes} bytes`
  if (bytes < MEGA) return `${(bytes / KILO).toFixed(1)} kB`
  return `${(bytes / MEGA).toFixed(1)} MB`
}
