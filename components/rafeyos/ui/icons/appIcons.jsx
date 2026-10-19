// Full-colour 48px app icons from the approved mockup
import { useId } from 'react'
import { APP } from '@/components/rafeyos/core/catalog/apps'

const FilesIcon = () => (
  <>
    <rect x="5" y="9" width="38" height="31" rx="5" fill="#7f7f7f" />
    <path d="M5 17h38v18a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" fill="#ececec" />
    <path d="M5 17h38v3H5z" fill="#d6d6d6" />
    <rect x="18" y="26" width="12" height="3.5" rx="1.75" fill="#a6a6a6" />
  </>
)

const TerminalIcon = () => (
  <>
    <rect x="4" y="7" width="40" height="34" rx="6" fill="#4a4a4a" />
    <rect x="6" y="13" width="36" height="26" rx="3" fill="#161616" />
    <circle cx="9.5" cy="10" r="1.3" fill="#9a9a9a" />
    <circle cx="13.5" cy="10" r="1.3" fill="#9a9a9a" />
    <path d="M12 21l5 4-5 4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 30h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
  </>
)

const EditorIcon = () => (
  <>
    <path d="M12 5h18l9 9v26a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#f6f6f6" />
    <path d="M30 5v9h9z" fill="#d4d4d4" />
    <path d="M15 20h17M15 25h17M15 30h12" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" />
    <path d="M33 26l7-7 3 3-7 7-4 1z" fill="#E95420" />
    <path d="M40 19l3 3" stroke="#a63c16" strokeWidth="1.5" />
  </>
)

// The gradient id must be unique per instance: the dock and the calendar can show it together
const MusicIcon = () => {
  const gradientId = useId()
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#d9431a" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${gradientId})`} />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1" />
      <circle cx="24" cy="24" r="7" fill="#2b2b2b" />
      <circle cx="24" cy="24" r="2" fill="#fff" />
    </>
  )
}

export const MailIcon = () => (
  <>
    <rect x="5" y="10" width="38" height="28" rx="4" fill="#f4f4f4" />
    <path d="M5 14l19 13 19-13" fill="none" stroke="#3584e4" strokeWidth="3" strokeLinejoin="round" />
    <path d="M5 34l13-10M43 34L30 24" stroke="#c9c9c9" strokeWidth="1.5" />
  </>
)

const ProjectsIcon = () => (
  <>
    <rect x="5" y="5" width="38" height="38" rx="9" fill="#141414" />
    <g fill="none" stroke="#f2f2f2" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M24 10l12 14-12 14-12-14z" />
      <path d="M12 24h24" />
      <path d="M24 10l-5 14 5 14 5-14z" />
    </g>
    <path d="M24 10l12 14" stroke="#39ff14" strokeWidth="1.8" />
  </>
)

const SettingsIcon = () => (
  <>
    <circle cx="24" cy="24" r="14" fill="none" stroke="#9b9b9b" strokeWidth="7" strokeDasharray="5.2 3.6" />
    <circle cx="24" cy="24" r="12" fill="#8a8a8a" />
    <circle cx="24" cy="24" r="5" fill="#3d3d3d" />
  </>
)

/** `full` draws a sheet sticking out of the lid, the way a Mac bin does once it holds a file. */
export const TrashIcon = ({ full = false }) => (
  <>
    <path d="M12 14h24l-2.2 26a3 3 0 0 1-3 2.7H17.2a3 3 0 0 1-3-2.7z" fill="#bdbdbd" />
    {full && <path data-paper d="M17 3h9l5 5v8H17z" fill="#f7f7f7" />}
    <rect x="9" y="9" width="30" height="6" rx="2" fill="#9a9a9a" />
    <path d="M20 20v16M24 20v16M28 20v16" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" />
  </>
)

const GRID_STOPS = [13, 24, 35]

const ShowAppsIcon = () => (
  <g fill="#fff">
    {GRID_STOPS.flatMap((y) => GRID_STOPS.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" />))}
  </g>
)

const PropertiesIcon = () => (
  <>
    <rect x="6" y="6" width="36" height="36" rx="18" fill="#777" />
    <path d="M24 22v12M24 15v.1" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
  </>
)

const APP_ICON_BODIES = Object.freeze({
  [APP.FILES]: FilesIcon,
  [APP.TERMINAL]: TerminalIcon,
  [APP.EDITOR]: EditorIcon,
  [APP.MUSIC]: MusicIcon,
  [APP.MAIL]: MailIcon,
  [APP.PROJECTS]: ProjectsIcon,
  [APP.SETTINGS]: SettingsIcon,
  [APP.PROPERTIES]: PropertiesIcon,
  trash: TrashIcon,
  apps: ShowAppsIcon,
})

/** @param {{ name: string, className?: string, full?: boolean }} props - an app id, or 'trash' / 'apps'. `full` is the Trash bin. */
export const AppIcon = ({ name, className, full = false }) => {
  const Body = APP_ICON_BODIES[name]
  if (!Body) throw new Error(`Unknown app icon: ${name}`)
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <Body full={full} />
    </svg>
  )
}
