// App metadata only. The UI layer attaches components by id; nothing here imports React.

// defaultPath: what a single-instance file app opens when launched without one (e.g. from the dock)
const app = ({ id, name, size, minSize, multi = false, inDock = true, defaultPath = '' }) =>
  Object.freeze({ id, name, size: Object.freeze(size), minSize: Object.freeze(minSize), multi, inDock, defaultPath })

export const APPS = Object.freeze({
  files: app({ id: 'files', name: 'Files', size: [760, 480], minSize: [480, 320], multi: true }),
  terminal: app({ id: 'terminal', name: 'Terminal', size: [640, 400], minSize: [360, 200], multi: true }),
  editor: app({ id: 'editor', name: 'Text Editor', size: [620, 440], minSize: [360, 240], defaultPath: '~/README.txt' }),
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
