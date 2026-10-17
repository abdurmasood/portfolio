// Which apps have a UI yet, and what to tell the visitor when something needs one that doesn't.
// Kept apart from the component map so pure modules (window manager, terminal effects) can use it.
import { APPS } from './registry'
import { NODE_TYPES } from '../vfs/buildVfs'

export const IMPLEMENTED_APPS = Object.freeze(['files', 'terminal'])

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

export const unavailableNote = (appId) =>
  appId ? `${APPS[appId]?.name ?? appId} isn't available yet` : "Opening links isn't available yet"
