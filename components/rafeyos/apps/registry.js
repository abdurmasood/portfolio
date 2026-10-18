// App list and what each app opens. Screens live in appComponents.js so this file stays free of React.
import { NODE_TYPES } from '../vfs/buildVfs'
import { realPath } from '../vfs/paths'

// defaultPath: what a single-instance file app opens when launched without one (e.g. from the dock)
const app = ({ id, name, size, minSize, multi = false, inDock = true, defaultPath = '' }) =>
  Object.freeze({ id, name, size: Object.freeze(size), minSize: Object.freeze(minSize), multi, inDock, defaultPath })

export const APPS = Object.freeze({
  files: app({ id: 'files', name: 'Files', size: [760, 480], minSize: [480, 320], multi: true }),
  terminal: app({ id: 'terminal', name: 'Terminal', size: [640, 400], minSize: [360, 200], multi: true }),
  editor: app({ id: 'editor', name: 'Text Editor', size: [620, 440], minSize: [360, 240] }),
  music: app({ id: 'music', name: 'Music', size: [380, 580], minSize: [340, 480] }),
  mail: app({ id: 'mail', name: 'Mail', size: [600, 460], minSize: [440, 360] }),
  projects: app({ id: 'projects', name: 'Projects', size: [820, 520], minSize: [560, 380] }),
  settings: app({ id: 'settings', name: 'Settings', size: [780, 540], minSize: [600, 420] }),
  properties: app({ id: 'properties', name: 'Properties', size: [340, 430], minSize: [340, 380], inDock: false }),
})

export const APP_IDS = Object.freeze(Object.keys(APPS))

export const DOCK_FAVORITES = Object.freeze(['files', 'terminal', 'editor', 'music', 'mail', 'projects', 'settings'])

export const getApp = (id) => {
  const entry = APPS[id]
  if (!entry) throw new Error(`Unknown app: ${id}`)
  return entry
}

export const IMPLEMENTED_APPS = Object.freeze(['files', 'terminal', 'editor', 'music', 'mail', 'projects', 'settings', 'properties'])

export const isImplemented = (appId) => IMPLEMENTED_APPS.includes(appId)

// The app that would open each kind of file (GNOME's default handlers)
const HANDLERS = Object.freeze({
  [NODE_TYPES.DIR]: 'files',
  [NODE_TYPES.TEXT]: 'editor',
  [NODE_TYPES.AUDIO]: 'music',
  [NODE_TYPES.MAILTO]: 'mail',
})

/** @returns {string|null} app id, or null for web links (opened in the browser) */
export const handlerFor = (node) => HANDLERS[node.type] ?? null

/** Web links open through the "Open Link" dialog rather than an app. Follows a symlink. */
export const isWebLink = (vfs, path) => vfs[realPath(vfs, path)]?.type === NODE_TYPES.WEBLINK

/** Audio files play as they open (Music starts the track). Follows a symlink. */
export const isAudio = (vfs, path) => vfs[realPath(vfs, path)]?.type === NODE_TYPES.AUDIO

export const unavailableNote = (appId) =>
  appId ? `${APPS[appId]?.name ?? appId} isn't available yet` : "Opening links isn't available yet"
