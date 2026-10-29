import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMusicControls, useServices, useSessionDispatch, useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { exec } from '@/components/rafeyos/core/commands/exec'
import { prompt } from '@/components/rafeyos/core/commands/lines'
import { SESSION_EVENTS } from '@/components/rafeyos/state/logic/sessionMachine'
import { isDir } from '@/components/rafeyos/core/vfs/queries'
import { START_DIR } from '@/components/rafeyos/core/vfs/buildVfs'
import { applyTerminalEffects } from './terminalEffects'
import { useOpenLinkDialog } from '@/components/rafeyos/ui/popups/OpenLinkDialog'

// Lets "Returning to the rafey.ai terminal…" show before the session ends (as in the mockup)
export const LOGOUT_DELAY_MS = 300

/** Output rows with stable keys, appended to or cleared. */
const useLog = () => {
  const [entries, setEntries] = useState([])
  const nextId = useRef(1)
  const toEntries = useCallback((lines) => lines.map((line) => ({ id: nextId.current++, line })), [])
  const append = useCallback((lines, { clearFirst = false } = {}) => {
    const added = toEntries(lines)
    setEntries((current) => (clearFirst ? added : [...current, ...added]))
  }, [toEntries])
  const clear = useCallback(() => setEntries([]), [])
  return { entries, append, clear }
}

const useDelayedLogout = () => {
  const sessionDispatch = useSessionDispatch()
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  return useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => sessionDispatch(SESSION_EVENTS.LOGOUT), LOGOUT_DELAY_MS)
  }, [sessionDispatch])
}

// What Ctrl+C leaves in $?: 128 + SIGINT
const INTERRUPTED_CODE = 130

/**
 * One terminal window's shell: its folder, variables and last exit code, the output log, and running lines through
 * exec() + effects.
 * @param {{ windowId: number, initialCwd: string }} options
 */
export const useTerminalSession = ({ windowId, initialCwd }) => {
  const { vfs, content, shellFs } = useVfs()
  const windowManager = useWindowManager()
  const { openExternal, now } = useServices()
  const logout = useDelayedLogout()
  const openLink = useOpenLinkDialog()
  const { play } = useMusicControls()
  const [cwd, setCwd] = useState(() => (initialCwd && isDir(vfs, initialCwd) ? initialCwd : START_DIR))
  // Read and written within one keypress, so a ref rather than state
  const shell = useRef({ cwd, env: { PWD: cwd }, lastCode: 0 })
  const log = useLog()
  const handlers = useMemo(
    () => ({ windowManager, openExternal, openLink, play, logout, closeSelf: () => windowManager.close(windowId) }),
    [windowManager, openExternal, openLink, play, logout, windowId],
  )
  const { append } = log
  const run = useCallback((raw) => {
    const before = shell.current
    const result = exec(raw, { fs: shellFs, cwd: before.cwd, env: before.env, lastCode: before.lastCode, content, now })
    shell.current = { cwd: result.cwd, env: result.env, lastCode: result.code }
    // Read after exec, so a file the line just made can be opened by it
    const { notes, clear } = applyTerminalEffects(result.effects, { ...handlers, vfs: shellFs.vfs() })
    setCwd(result.cwd)
    const echoed = clear ? [] : [prompt(before.cwd, raw)]
    append([...echoed, ...result.lines, ...notes], { clearFirst: clear })
  }, [shellFs, content, now, handlers, append])
  // Ctrl+C at the prompt: the abandoned line is echoed with ^C and $? becomes 130
  const interrupt = useCallback((input) => {
    shell.current = { ...shell.current, lastCode: INTERRUPTED_CODE }
    append([prompt(shell.current.cwd, `${input}^C`)])
  }, [append])
  return { cwd, entries: log.entries, run, interrupt, append, clear: log.clear }
}
