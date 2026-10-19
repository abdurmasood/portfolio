// 16px symbolic icons from the approved mockup (Yaru-style strokes in currentColor)

// Wi-Fi bands are filled ring segments fanned out from a point just below the icon
const WIFI_ORIGIN = Object.freeze({ x: 8, y: 13.6 })
const WIFI_SPREAD_RADIANS = (42 * Math.PI) / 180
const wifiPoint = (radius, angle) =>
  `${(WIFI_ORIGIN.x + Math.cos(angle) * radius).toFixed(2)} ${(WIFI_ORIGIN.y + Math.sin(angle) * radius).toFixed(2)}`
const bandPath = (innerRadius, outerRadius) => {
  const start = -Math.PI / 2 - WIFI_SPREAD_RADIANS
  const end = -Math.PI / 2 + WIFI_SPREAD_RADIANS
  return `M${wifiPoint(outerRadius, start)} A${outerRadius} ${outerRadius} 0 0 1 ${wifiPoint(outerRadius, end)} `
    + `L${wifiPoint(innerRadius, end)} A${innerRadius} ${innerRadius} 0 0 0 ${wifiPoint(innerRadius, start)} Z`
}

// Inner, middle, outer. The reconnect sweep shows one at a time, then all three.
export const WIFI_ARCS = Object.freeze([bandPath(3.7, 5.5), bandPath(7, 8.8), bandPath(10.3, 12)])

// Filled 8-tooth cog with a centre hole (evenodd)
const GEAR_TEETH = 8
const gearPath = () => {
  const points = []
  const toothWidth = Math.PI / GEAR_TEETH
  for (let tooth = 0; tooth < GEAR_TEETH; tooth += 1) {
    const angle = (tooth / GEAR_TEETH) * Math.PI * 2
    const outline = [[-0.5, 5.6], [-0.32, 7.4], [0.32, 7.4], [0.5, 5.6], [1, 5.6]]
    outline.forEach(([offset, radius]) => {
      const at = angle + offset * toothWidth
      points.push(`${(8 + Math.cos(at) * radius).toFixed(2)} ${(8 + Math.sin(at) * radius).toFixed(2)}`)
    })
  }
  return `M${points.join(' L')} Z M10.4 8 A2.4 2.4 0 1 0 5.6 8 A2.4 2.4 0 1 0 10.4 8 Z`
}
const GEAR_PATH = gearPath()

const SYMBOL_SVG = Object.freeze({
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
})

const FILLED = Object.freeze({ fill: 'currentColor', stroke: 'none' })
const wifiDot = () => <circle cx="8" cy="12.4" r="1.6" {...FILLED} />
const wifiArc = (d) => <path key={d} d={d} {...FILLED} />

const SYMBOL_PATHS = Object.freeze({
  back: <path d="M10 3L5 8l5 5" />,
  fwd: <path d="M6 3l5 5-5 5" />,
  down: <path d="M4 6l4 4 4-4" />,
  search: <><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>,
  menu: <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />,
  grid: <><rect x="2.5" y="2.5" width="4" height="4" rx="1" /><rect x="9.5" y="2.5" width="4" height="4" rx="1" /><rect x="2.5" y="9.5" width="4" height="4" rx="1" /><rect x="9.5" y="9.5" width="4" height="4" rx="1" /></>,
  list: <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />,
  home: <><path d="M2.5 7.5L8 3l5.5 4.5v6h-11z" /><path d="M6.5 13.5v-4h3v4" /></>,
  folder: <path d="M1.75 4h4.5l1.5 1.5h6.5v7.5h-12.5z" />,
  desktop: <><rect x="1.75" y="2.5" width="12.5" height="8.5" rx="1" /><path d="M5.5 13.5h5M8 11v2.5" /></>,
  recent: <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>,
  star: <path d="M8 2l1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3 4.3 13.3l.8-4.1L2 6.3l4.2-.5z" />,
  music: <><path d="M6 12V3.5l7-1.5v9" /><circle cx="4.25" cy="12" r="1.75" /><circle cx="11.25" cy="11" r="1.75" /></>,
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9" />,
  plus: <path d="M8 3v10M3 8h10" />,
  min: <path d="M4.5 8.5h7" />,
  max: <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />,
  unmax: <><rect x="4.5" y="6" width="5.5" height="5.5" rx="1.2" /><path d="M6.5 4h4a1.5 1.5 0 0 1 1.5 1.5v4" /></>,
  close: <path d="M5 5l6 6M11 5l-6 6" />,
  play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" />,
  pause: <path d="M5.5 3.5v9M10.5 3.5v9" strokeWidth="2.4" />,
  prev: <><path d="M12 3.5v9L6 8z" fill="currentColor" /><path d="M4 3.5v9" /></>,
  next: <><path d="M4 3.5v9L10 8z" fill="currentColor" /><path d="M12 3.5v9" /></>,
  repeat: <><path d="M2.5 8V6.5a2 2 0 0 1 2-2h9M11.5 2.5l2 2-2 2" /><path d="M13.5 8v1.5a2 2 0 0 1-2 2h-9M4.5 13.5l-2-2 2-2" /></>,
  vol: <><path d="M2.5 6h2.5L8.5 3v10L5 10H2.5z" fill="currentColor" /><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.5 6.5 0 0 1 0 9" /></>,
  vol0: <><path d="M2.5 6h2.5L8.5 3v10L5 10H2.5z" fill="currentColor" /><path d="M11 6l3 4M14 6l-3 4" /></>,
  wifi: <>{WIFI_ARCS.map(wifiArc)}{wifiDot()}</>,
  wifioff: <><path d={WIFI_ARCS[0] + WIFI_ARCS[1]} {...FILLED} opacity=".35" /><path d="M2 2l12 12" /></>,
  power: <><path d="M8 2v6" /><path d="M4.6 4.4a5 5 0 1 0 6.8 0" /></>,
  gear: <path d={GEAR_PATH} {...FILLED} fillRule="evenodd" />,
  lock: <><rect x="3.5" y="7" width="9" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></>,
  camera: <><rect x="1.75" y="4.5" width="12.5" height="9" rx="1.5" /><circle cx="8" cy="9" r="2.5" /><path d="M5.5 4.5l1-2h3l1 2" /></>,
  bt: <path d="M5 5l6 6-3 2.5V2.5L11 5l-6 6" />,
  night: <path d="M12.5 10A5.5 5.5 0 0 1 6 3.5a5.5 5.5 0 1 0 6.5 6.5z" />,
  dark: <><circle cx="8" cy="8" r="6" /><path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor" /></>,
  bell: <><path d="M4 11V7a4 4 0 0 1 8 0v4l1 1.5H3z" /><path d="M6.5 14a1.5 1.5 0 0 0 3 0" /></>,
  palette: <><path d="M8 1.75a6.25 6.25 0 1 0 0 12.5c1 0 1.4-.7 1-1.5-.5-1 .2-2 1.3-2h1.4A2.6 2.6 0 0 0 14.25 8 6.25 6.25 0 0 0 8 1.75z" /><circle cx="5" cy="7" r=".8" fill="currentColor" /><circle cx="8" cy="4.8" r=".8" fill="currentColor" /><circle cx="11" cy="6.5" r=".8" fill="currentColor" /></>,
  dock: <><rect x="1.75" y="2.5" width="12.5" height="11" rx="1.5" /><path d="M5 2.5v11" /></>,
  info: <><circle cx="8" cy="8" r="6.25" /><path d="M8 7.5V11M8 5h.01" /></>,
  chev: <path d="M6 3l5 5-5 5" />,
  check: <path d="M3.5 8.5l3 3 6-7" />,
  doc: <><path d="M4 1.75h5.5l3 3v9.5H4z" /><path d="M9.5 1.75v3h3" /></>,
  link: <path d="M9 3h4v4M13 3L7.5 8.5M11.5 9.5v3.25h-8.75V4h3.25" />,
  send: <path d="M2 8l12-5.5L9.5 14l-2-4.5z" />,
  enter: <path d="M13 3.5v4.5a2 2 0 0 1-2 2H3.5M6 7l-3 3 3 3" />,
  apps: <><circle cx="3.5" cy="3.5" r="1.2" fill="currentColor" /><circle cx="8" cy="3.5" r="1.2" fill="currentColor" /><circle cx="12.5" cy="3.5" r="1.2" fill="currentColor" /><circle cx="3.5" cy="8" r="1.2" fill="currentColor" /><circle cx="8" cy="8" r="1.2" fill="currentColor" /><circle cx="12.5" cy="8" r="1.2" fill="currentColor" /><circle cx="3.5" cy="12.5" r="1.2" fill="currentColor" /><circle cx="8" cy="12.5" r="1.2" fill="currentColor" /><circle cx="12.5" cy="12.5" r="1.2" fill="currentColor" /></>,
  terminal: <><rect x="1.75" y="2.5" width="12.5" height="11" rx="1.5" /><path d="M4.5 6l2 2-2 2M8 10.5h3" /></>,
  user: <><circle cx="8" cy="5.5" r="2.75" /><path d="M2.75 14a5.25 5.25 0 0 1 10.5 0" /></>,
})

export const SYMBOL_NAMES = Object.freeze(Object.keys(SYMBOL_PATHS))

/** @param {{ name: string, className?: string }} props */
export const Sym = ({ name, className }) => {
  const paths = SYMBOL_PATHS[name]
  if (!paths) throw new Error(`Unknown symbol: ${name}`)
  return (
    <svg {...SYMBOL_SVG} className={className}>
      {paths}
    </svg>
  )
}

/** All three bands. While reconnecting, only `arc` is visible and the others fade out. Null means connected. */
export const WifiGlyph = ({ arc = null }) => (
  <svg {...SYMBOL_SVG} className="wifi-live">
    {WIFI_ARCS.map((d, index) => (
      <path key={d} d={d} {...FILLED} style={{ opacity: arc == null || index === arc ? 1 : 0 }} />
    ))}
    {wifiDot()}
  </svg>
)
