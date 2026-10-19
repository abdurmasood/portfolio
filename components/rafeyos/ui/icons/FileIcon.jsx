// File and folder icons from the approved mockup; folders take the accent colour
import { HOME, TRASH, NODE_TYPES } from '@/components/rafeyos/core/vfs/buildVfs'
import { children } from '@/components/rafeyos/core/vfs/queries'
import { MailIcon, TrashIcon } from './appIcons'

const FOLDER_TAB = { fill: 'color-mix(in srgb, var(--accent) 62%, #000)' }
const FOLDER_BODY = { fill: 'var(--accent)' }
const FOLDER_LIP = { fill: 'color-mix(in srgb, var(--accent) 80%, #fff)' }
const FOLDER_GLYPH = { color: 'color-mix(in srgb, var(--accent) 45%, #000)' }

const GLYPH_STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.8' }

const FOLDER_GLYPHS = Object.freeze({
  [HOME]: <path d="M2.5 7.5L8 3l5.5 4.5v6h-11z" strokeLinejoin="round" />,
  '~/Desktop': (
    <>
      <rect x="2" y="3" width="12" height="8" rx="1" />
      <path d="M6 13.5h4" />
    </>
  ),
  '~/Music': (
    <>
      <path d="M6 12V3.5l7-1.5v9" />
      <circle cx="4.25" cy="12" r="1.75" />
      <circle cx="11.25" cy="11" r="1.75" />
    </>
  ),
})

const Folder = ({ glyph }) => (
  <>
    <path d="M6 14a4 4 0 0 1 4-4h14l5 5h25a4 4 0 0 1 4 4v3H6z" style={FOLDER_TAB} />
    <rect x="6" y="20" width="52" height="36" rx="4" style={FOLDER_BODY} />
    <rect x="6" y="20" width="52" height="3" style={FOLDER_LIP} />
    {glyph && (
      <g transform="translate(22 28) scale(1.25)" style={FOLDER_GLYPH}>
        <g {...GLYPH_STROKE}>{glyph}</g>
      </g>
    )}
  </>
)

const Page = ({ children }) => (
  <>
    <path
      d="M15 6h24l12 12v38a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"
      fill="#f7f7f7"
      stroke="rgba(0,0,0,.12)"
    />
    <path d="M39 6v12h12z" fill="#dcdcdc" />
    {children}
  </>
)

const TextLines = () => (
  <g stroke="#a3a3a3" strokeWidth="2.2" strokeLinecap="round">
    <path d="M20 27h24M20 33h24M20 39h24M20 45h16" />
  </g>
)

const AudioNote = () => (
  <g transform="translate(20 24) scale(1.5)" fill="none" stroke="#E95420" strokeWidth="1.8">
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
  const node = vfs[path]
  if (path === TRASH) return { viewBox: '0 0 48 48', body: <TrashIcon full={children(vfs, TRASH).length > 0} /> }
  if (node.type === NODE_TYPES.DIR) return { viewBox: ICON_64, body: <Folder glyph={FOLDER_GLYPHS[path]} /> }
  if (node.type === NODE_TYPES.AUDIO) return { viewBox: ICON_64, body: <Page><AudioNote /></Page> }
  if (node.type === NODE_TYPES.MAILTO) return { viewBox: '-4 -4 56 56', body: <MailIcon /> }
  if (node.type === NODE_TYPES.WEBLINK) return { viewBox: ICON_64, body: <Globe /> }
  return { viewBox: ICON_64, body: <Page><TextLines /></Page> }
}

/** A vfs entry's icon; symlinks show their target's icon with a link badge. */
export const FileIcon = ({ vfs, path, className }) => {
  const node = vfs[path]
  const isLink = node.type === NODE_TYPES.SYMLINK
  const { viewBox, body } = iconFor(vfs, isLink ? node.target : path)
  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true">
      {body}
      {isLink && <LinkBadge />}
    </svg>
  )
}
