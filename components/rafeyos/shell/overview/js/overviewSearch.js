// What the Activities overview's search finds: apps, files and Settings pages (mockup drawOv). Pure.
import { APP_IDS, getApp } from '../../../apps/registry'
import { isImplemented } from '../../../apps/availability'
import { SETTINGS_PAGES } from '../../../apps/settings/settingsPages'
import { displayName, search } from '../../../vfs/queries'
import { parentOf, tilde } from '../../../vfs/paths'

export const MAX_FILE_RESULTS = 6

export const RESULT_KINDS = Object.freeze({ APP: 'app', FILE: 'file', SETTING: 'setting' })

// The Settings pages search can reach, in the mockup's order and wording
export const SETTINGS_RESULTS = Object.freeze([
  Object.freeze({ label: 'Appearance', page: SETTINGS_PAGES.APPEARANCE }),
  Object.freeze({ label: 'Ubuntu Desktop', page: SETTINGS_PAGES.DESKTOP }),
  Object.freeze({ label: 'Sound', page: SETTINGS_PAGES.SOUND }),
  Object.freeze({ label: 'Notifications', page: SETTINGS_PAGES.NOTIFICATIONS }),
  Object.freeze({ label: 'About', page: SETTINGS_PAGES.ABOUT }),
])

/** Every app the visitor can launch: built, and shown in the dock (Properties isn't). */
export const overviewApps = () => APP_IDS.filter((id) => isImplemented(id) && getApp(id).inDock)

const matchesApp = (id, needle) => getApp(id).name.toLowerCase().includes(needle) || id.includes(needle)

const fileResult = (vfs, path) => ({ path, name: displayName(vfs, path), parent: tilde(parentOf(path)) })

/**
 * @param {object} vfs
 * @param {string} query - as typed; matching ignores case and surrounding spaces
 * @returns {{ apps: string[], files: { path, name, parent }[], settings: { label, page }[] }}
 */
export const overviewResults = (vfs, query) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return { apps: [], files: [], settings: [] }
  return {
    apps: overviewApps().filter((id) => matchesApp(id, needle)),
    files: search(vfs, needle).slice(0, MAX_FILE_RESULTS).map((path) => fileResult(vfs, path)),
    settings: SETTINGS_RESULTS.filter((entry) => entry.label.toLowerCase().includes(needle)),
  }
}

export const hasResults = ({ apps, files, settings }) => apps.length + files.length + settings.length > 0

/**
 * What Enter launches: the first result shown, or the first app in the app grid; null for none.
 * @returns {{ kind: string, id?: string, path?: string, page?: string }|null}
 */
export const firstResult = (results, { appGrid = false } = {}) => {
  if (appGrid) {
    const [first] = overviewApps()
    return first ? { kind: RESULT_KINDS.APP, id: first } : null
  }
  if (results.apps.length) return { kind: RESULT_KINDS.APP, id: results.apps[0] }
  if (results.files.length) return { kind: RESULT_KINDS.FILE, path: results.files[0].path }
  if (results.settings.length) return { kind: RESULT_KINDS.SETTING, page: results.settings[0].page }
  return null
}
