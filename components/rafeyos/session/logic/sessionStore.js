// Remembers, per tab, that the desktop was reached so a refresh skips the boot splash.
// Storage may be null or throw (private mode, blocked site data); that only costs the skip.

export const SESSION_KEY = 'rafeyos-session'
const DESKTOP_VALUE = 'desktop'

export const rememberDesktop = (storage) => {
  try {
    storage?.setItem(SESSION_KEY, DESKTOP_VALUE)
  } catch {
    // Not remembering is the safe fallback: the next load just boots again
  }
}

export const forgetDesktop = (storage) => {
  try {
    storage?.removeItem(SESSION_KEY)
  } catch {
    // Nothing stored that we can reach, so nothing to forget
  }
}

export const isDesktopRemembered = (storage) => {
  try {
    return storage?.getItem(SESSION_KEY) === DESKTOP_VALUE
  } catch {
    return false
  }
}
