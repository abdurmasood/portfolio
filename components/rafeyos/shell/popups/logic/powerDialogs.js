// The session confirmations (mockup wording). Each counts down and runs `confirm` at zero.
// Log Out and Power Off leave rafeyOS for the home terminal; Restart replays the boot.
import { SESSION_EVENTS } from '../../../session/logic/sessionMachine'

export const POWER_DIALOG_SECONDS = 60

const RESTART_ACTION = Object.freeze({ label: 'Restart', className: '', event: SESSION_EVENTS.RESTART })

export const POWER_DIALOGS = Object.freeze({
  logout: Object.freeze({
    title: 'Log Out',
    body: (seconds) => `You will return to the rafey.ai terminal in ${seconds} seconds.`,
    extra: Object.freeze([]),
    confirm: Object.freeze({ label: 'Log Out', className: 'sugg', event: SESSION_EVENTS.LOGOUT }),
  }),
  restart: Object.freeze({
    title: 'Restart',
    body: (seconds) => `The system will restart automatically in ${seconds} seconds.`,
    extra: Object.freeze([]),
    confirm: Object.freeze({ ...RESTART_ACTION, className: 'sugg' }),
  }),
  poweroff: Object.freeze({
    title: 'Power Off',
    body: (seconds) => `rafeyOS will power off and return to the terminal in ${seconds} seconds.`,
    extra: Object.freeze([RESTART_ACTION]),
    confirm: Object.freeze({ label: 'Power Off', className: 'danger', event: SESSION_EVENTS.POWEROFF }),
  }),
})

export const isPowerDialog = (kind) => Object.hasOwn(POWER_DIALOGS, kind)
