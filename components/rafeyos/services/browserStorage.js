/**
 * The tab's sessionStorage, or null when the browser refuses access
 * (merely reading window.sessionStorage throws when site data is blocked).
 */
export const sessionStorageOrNull = (win = globalThis.window) => {
  try {
    return win?.sessionStorage ?? null
  } catch {
    return null
  }
}
