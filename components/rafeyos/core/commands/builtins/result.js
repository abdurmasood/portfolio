// Shared by the command modules: every handler returns { lines, effects, cwd? }
export const result = (lines = [], effects = []) => ({ lines, effects })

export const EFFECTS = Object.freeze({
  OPEN_APP: 'openApp',
  OPEN_PATH: 'openPath',
  OPEN_LINK: 'openLink',
  OPEN_EXTERNAL: 'openExternal',
  PLAY: 'play',
  CLEAR: 'clear',
  CLOSE_SELF: 'closeSelf',
  LOGOUT: 'logout',
})
