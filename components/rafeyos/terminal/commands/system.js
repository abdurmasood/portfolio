// System commands: identity, echo, refusals, clear, exit, logout
import { error, pre } from '../lines'
import { result, EFFECTS } from './result'

const whoami = () => result([pre('visitor')])

const uname = ({ parsed }) =>
  result([pre(parsed.flags.includes('-a') ? 'Linux rafey 6.8.0-rafey x86_64 GNU/Linux' : 'Linux')])

const echo = ({ parsed }) => result([pre(parsed.words.join(' '))])

const sudo = () => result([error('visitor is not in the sudoers file.  This incident will be reported.')])

const denied = ({ name }) => result([error(`${name}: Permission denied`)])

const clear = () => result([], [{ type: EFFECTS.CLEAR }])

const exit = () => result([pre('logout')], [{ type: EFFECTS.CLOSE_SELF }])

const logout = () => result([pre('Returning to the rafey.ai terminal…')], [{ type: EFFECTS.LOGOUT }])

const alreadyRunning = () => result([pre('rafeyos: already running')])

export const systemCommands = Object.freeze({
  whoami,
  uname,
  echo,
  sudo,
  rm: denied,
  mkdir: denied,
  mv: denied,
  touch: denied,
  grep: denied,
  clear,
  exit,
  logout,
  rafeyos: alreadyRunning,
  startx: alreadyRunning,
})
