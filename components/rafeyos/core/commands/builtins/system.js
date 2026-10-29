// System commands: identity, echo, true/false, refusals, clear, exit, logout
import { pre } from '@/components/rafeyos/core/commands/lines'
import { failure, result, EFFECTS } from './result'

const whoami = () => ({ stdout: 'visitor\n' })

const uname = ({ argv }) => ({ stdout: argv.includes('-a') ? 'Linux rafey.ai 6.8.0-rafey x86_64 GNU/Linux\n' : 'Linux\n' })

const echo = ({ argv }) => ({ stdout: `${argv.join(' ')}\n` })

// Builtins that only set $?, so && and || have something to show off
const succeed = () => ({ code: 0 })
const fail = () => ({ code: 1 })

const sudo = () => failure('visitor is not in the sudoers file.  This incident will be reported.')

const denied = ({ name }) => failure(`${name}: Permission denied`)

const clear = () => result([], [{ type: EFFECTS.CLEAR }])

const exit = () => result([pre('logout')], [{ type: EFFECTS.CLOSE_SELF }])

const logout = () => result([pre('Returning to the rafey.ai terminal…')], [{ type: EFFECTS.LOGOUT }])

const alreadyRunning = () => result([pre('rOS: already running')])

export const systemCommands = Object.freeze({
  whoami,
  uname,
  echo,
  true: succeed,
  false: fail,
  sudo,
  grep: denied,
  clear,
  exit,
  logout,
  os: alreadyRunning,
  rafeyos: alreadyRunning,
  startx: alreadyRunning,
})
