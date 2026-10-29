import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMusicControls, useServices, useSessionDispatch, useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { ENV, exec } from '@/components/rafeyos/core/commands/exec'
import { recordHistory } from '@/components/rafeyos/core/commands/history'
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

/**
 * Records a line before it runs, so `history` lists the line itself. A write that fails is silent: the result is the
 * window's own lines for `history` to list instead, and empty when the file took the line.
 */
const record = (shellFs, raw, ownLines) => {
  if (!raw.trim()) return []
  ownLines.current = [...ownLines.current, raw]
  return shellFs.apply(recordHistory, { line: raw }).ok ? [] : ownLines.current
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
  // When this window's shell started: uptime counts from it
  const [startedAt] = useState(() => now())
  // Read and written within one keypress, so a ref rather than state
  const shell = useRef({ cwd, env: { PWD: cwd }, lastCode: 0 })
  // This window's lines since it opened or last ran `history -c`: what `history` lists when the file can't be written
  const ownLines = useRef([])
  const log = useLog()
  const handlers = useMemo(
    () => ({ windowManager, openExternal, openLink, play, logout, closeSelf: () => windowManager.close(windowId) }),
    [windowManager, openExternal, openLink, play, logout, windowId],
  )
  const { append } = log
  // Tells the caller whether the line ran `history -c`, so the ↑ list can forget too
  const run = useCallback((raw) => {
    const before = shell.current
    const history = record(shellFs, raw, ownLines)
    const result = exec(raw, { fs: shellFs, cwd: before.cwd, env: before.env, lastCode: before.lastCode, content, history, now, startedAt })
    shell.current = { cwd: result.cwd, env: result.env, lastCode: result.code }
    let historyCleared = false
    const clearHistory = () => {
      historyCleared = true
      ownLines.current = []
    }
    // Read after exec, so a file the line just made can be opened by it
    const { notes, clear } = applyTerminalEffects(result.effects, { ...handlers, clearHistory, vfs: shellFs.vfs() })
    setCwd(result.cwd)
    const echoed = clear ? [] : [prompt(before.cwd, raw)]
    append([...echoed, ...result.lines, ...notes], { clearFirst: clear })
    return { historyCleared }
  }, [shellFs, content, now, startedAt, handlers, append])
  // Ctrl+C at the prompt: the abandoned line is echoed with ^C and $? becomes 130
  const interrupt = useCallback((input) => {
    shell.current = { ...shell.current, lastCode: INTERRUPTED_CODE }
    append([prompt(shell.current.cwd, `${input}^C`)])
  }, [append])
  // The window's variables and $? as they are now, for Tab to fill in a typed `$HOME/` or `$OLDPWD/`
  const variables = useCallback(() => ({ env: { ...ENV, ...shell.current.env }, lastCode: shell.current.lastCode }), [])
  return { cwd, entries: log.entries, run, interrupt, variables, append, clear: log.clear }
}
