/**
 * The tab's sessionStorage, or null when the browser refuses access
 * (merely reading window.sessionStorage throws when site data is blocked).
 */
const storageOrNull = (win, key) => {
  try {
    return win?.[key] ?? null
  } catch {
    return null
  }
}

export const sessionStorageOrNull = (win = globalThis.window) => storageOrNull(win, 'sessionStorage')

/** This computer's localStorage, or null when the browser refuses access. */
export const localStorageOrNull = (win = globalThis.window) => storageOrNull(win, 'localStorage')
