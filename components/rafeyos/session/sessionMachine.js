export const SESSION_STATES = Object.freeze({
  BOOT: 'boot',
  DESKTOP: 'desktop',
  LOCK: 'lock',
  SUSPENDED: 'suspended',
  EXITED: 'exited',
})

export const SESSION_EVENTS = Object.freeze({
  BOOT_DONE: 'BOOT_DONE',
  SKIP: 'SKIP',
  LOCK: 'LOCK',
  UNLOCK: 'UNLOCK',
  SUSPEND: 'SUSPEND',
  WAKE: 'WAKE',
  RESTART: 'RESTART',
  LOGOUT: 'LOGOUT',
  POWEROFF: 'POWEROFF',
})

const { BOOT, DESKTOP, LOCK, SUSPENDED, EXITED } = SESSION_STATES

// Log Out and Power Off both leave rafeyOS for the home terminal
const LEAVE = Object.freeze({ LOGOUT: EXITED, POWEROFF: EXITED })

const TRANSITIONS = Object.freeze({
  [BOOT]: { BOOT_DONE: DESKTOP, SKIP: DESKTOP, ...LEAVE },
  [DESKTOP]: { LOCK, SUSPEND: SUSPENDED, RESTART: BOOT, ...LEAVE },
  [LOCK]: { UNLOCK: DESKTOP, ...LEAVE },
  [SUSPENDED]: { WAKE: DESKTOP, ...LEAVE },
  [EXITED]: {},
})

/** Unknown or disallowed events leave the state unchanged. */
export const next = (state, event) => TRANSITIONS[state]?.[event] ?? state

/** A refresh in the same tab skips the boot splash. */
export const initialSessionState = (remembered) => (remembered ? DESKTOP : BOOT)
