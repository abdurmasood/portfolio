// The Log Out and Power Off confirmations (mockup wording). Both leave rafeyOS for the home terminal.
import { SESSION_EVENTS } from '../session/sessionMachine'

export const POWER_DIALOG_SECONDS = 60

export const POWER_DIALOGS = Object.freeze({
  logout: Object.freeze({
    title: 'Log Out',
    body: (seconds) => `You will return to the rafey.ai terminal in ${seconds} seconds.`,
    confirm: Object.freeze({ label: 'Log Out', className: 'sugg', event: SESSION_EVENTS.LOGOUT }),
  }),
  poweroff: Object.freeze({
    title: 'Power Off',
    body: (seconds) => `rafeyOS will power off and return to the terminal in ${seconds} seconds.`,
    confirm: Object.freeze({ label: 'Power Off', className: 'danger', event: SESSION_EVENTS.POWEROFF }),
  }),
})
