// File and folder icons, shaded like the dock's tiles; folders take the accent colour
import { useId } from 'react'
import { HOME, RAFEY_HOME, TRASH, NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath, realPath } from '@/components/rafeyos/core/vfs/paths'
import { children } from '@/components/rafeyos/core/vfs/queries'
import { MailIcon, TrashIcon } from './appIcons'

// Folders are lit from the top: each part runs from a lighter to a deeper mix of the accent
const FOLDER_TAB_STOPS = ['color-mix(in srgb, var(--accent) 78%, #000)', 'color-mix(in srgb, var(--accent) 62%, #000)']
const FOLDER_BODY_STOPS = ['color-mix(in srgb, var(--accent) 78%, #fff)', 'color-mix(in srgb, var(--accent) 92%, #000)']
const FOLDER_GLYPH = { color: 'color-mix(in srgb, var(--accent) 52%, #000)' }
const AUDIO_NOTE = { stroke: 'var(--accent)' }
const PAGE_STOPS = ['#ffffff', '#e9e9e9']
const FOLD_STOPS = ['#f2f2f2', '#cfcfcf']

const GLYPH_STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.8' }

const FOLDER_GLYPHS = Object.freeze({
  [HOME]: <path d="M2.5 7.5L8 3l5.5 4.5v6h-11z" strokeLinejoin="round" />,
  [joinPath(HOME, 'Desktop')]: (
    <>
      <rect x="2" y="3" width="12" height="8" rx="1" />
      <path d="M6 13.5h4" />
    </>
  ),
  [joinPath(RAFEY_HOME, 'Music')]: (
    <>
      <path d="M6 12V3.5l7-1.5v9" />
      <circle cx="4.25" cy="12" r="1.75" />
      <circle cx="11.25" cy="11" r="1.75" />
    </>
  ),
})

/** A two-stop gradient; stops are styles so they can take color-mix() of the accent. */
const Gradient = ({ id, stops: [from, to], diagonal = false }) => (
  <linearGradient id={id} x1="0" y1="0" x2={diagonal ? '1' : '0'} y2="1">
    <stop offset="0" style={{ stopColor: from }} />
    <stop offset="1" style={{ stopColor: to }} />
  </linearGradient>
)

// Gradient ids must be unique per instance: the Files grid shows many folders at once
const Folder = ({ glyph }) => {
  const id = useId()
  return (
    <>
      <defs>
        <Gradient id={`${id}tab`} stops={FOLDER_TAB_STOPS} />
        <Gradient id={`${id}body`} stops={FOLDER_BODY_STOPS} />
      </defs>
      <path d="M6 15a5 5 0 0 1 5-5h12.5l5 5H53a5 5 0 0 1 5 5v4H6z" fill={`url(#${id}tab)`} />
      <rect x="6" y="19" width="52" height="37" rx="5" fill={`url(#${id}body)`} />
      <path d="M11 20.4h42" stroke="rgba(255,255,255,.45)" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="6.5" y="19.5" width="51" height="36" rx="4.5" fill="none" stroke="rgba(0,0,0,.12)" />
      {glyph && (
        <g transform="translate(22 29) scale(1.25)" style={FOLDER_GLYPH}>
          <g {...GLYPH_STROKE}>{glyph}</g>
        </g>
      )}
    </>
  )
}

const Page = ({ children }) => {
  const id = useId()
  return (
    <>
      <defs>
        <Gradient id={`${id}page`} stops={PAGE_STOPS} />
        <Gradient id={`${id}fold`} stops={FOLD_STOPS} diagonal />
      </defs>
      <path
        d="M16 6h23l12 12v37a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z"
        fill={`url(#${id}page)`}
        stroke="rgba(0,0,0,.1)"
      />
      <path d="M39 6v8a4 4 0 0 0 4 4h8z" fill={`url(#${id}fold)`} />
      {children}
    </>
  )
}

const TextLines = () => (
  <g stroke="#b3b3b3" strokeWidth="2.2" strokeLinecap="round">
    <path d="M20 28h24M20 34h24M20 40h24M20 46h15" />
  </g>
)

const AudioNote = () => (
  <g transform="translate(20 24) scale(1.5)" fill="none" strokeWidth="1.8" style={AUDIO_NOTE}>
    <path d="M6 12V3.5l7-1.5v9" />
    <circle cx="4.25" cy="12" r="1.75" />
    <circle cx="11.25" cy="11" r="1.75" />
  </g>
)

const Globe = () => (
  <>
    <circle cx="32" cy="32" r="24" fill="#3584e4" />
    <g fill="none" stroke="#fff" strokeWidth="2.4" opacity=".9">
      <circle cx="32" cy="32" r="24" />
      <ellipse cx="32" cy="32" rx="10" ry="24" />
      <path d="M8 32h48M12 20h40M12 44h40" />
    </g>
  </>
)

const LinkBadge = () => (
  <g transform="translate(40 44)">
    <rect width="18" height="16" rx="4" fill="#fff" stroke="rgba(0,0,0,.25)" />
    <path
      d="M5 11V8a3 3 0 0 1 3-3h5M10.5 2.5L13 5l-2.5 2.5"
      fill="none"
      stroke="#333"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </g>
)

const ICON_64 = '0 0 64 64'

/** @returns {{ viewBox: string, body: JSX.Element }} */
const iconFor = (vfs, path) => {
  // Undefined for a path that is gone; it and a link that leads nowhere fall through to the plain page
  const type = vfs[path]?.type
  if (path === TRASH) return { viewBox: '0 0 48 48', body: <TrashIcon full={children(vfs, TRASH).length > 0} /> }
  if (type === NODE_TYPES.DIR) return { viewBox: ICON_64, body: <Folder glyph={FOLDER_GLYPHS[path]} /> }
  if (type === NODE_TYPES.AUDIO) return { viewBox: ICON_64, body: <Page><AudioNote /></Page> }
  if (type === NODE_TYPES.MAILTO) return { viewBox: '-4 -4 56 56', body: <MailIcon /> }
  if (type === NODE_TYPES.WEBLINK) return { viewBox: ICON_64, body: <Globe /> }
  return { viewBox: ICON_64, body: <Page><TextLines /></Page> }
}

/** A vfs entry's icon; symlinks show what they reach with a link badge. A path that is gone draws the plain page. */
export const FileIcon = ({ vfs, path, className }) => {
  const isLink = vfs[path]?.type === NODE_TYPES.SYMLINK
  const { viewBox, body } = iconFor(vfs, isLink ? realPath(vfs, path) : path)
  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true">
      {body}
      {isLink && <LinkBadge />}
    </svg>
  )
}
