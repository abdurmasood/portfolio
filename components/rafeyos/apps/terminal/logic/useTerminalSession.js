import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMusicControls, useServices, useSessionDispatch, useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { ENV, exec } from '@/components/rafeyos/core/commands/exec'
import { recordHistory } from '@/components/rafeyos/core/commands/history'
import { prompt } from '@/components/rafeyos/core/commands/lines'
import { SESSION_EVENTS } from '@/components/rafeyos/state/logic/sessionMachine'
import { isDir } from '@/components/rafeyos/core/vfs/queries'
import { START_DIR } from '@/components/rafeyos/core/vfs/buildVfs'
import { settingsView } from '@/components/rafeyos/core/settings/settingsView'
import { windowProcesses } from '@/components/rafeyos/core/commands/builtins/process'
import { applyTerminalEffects } from './terminalEffects'
import { useOwnLines } from './useCommandRecall'
import { useQuestion } from './useQuestion'
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

/** What every line runs with besides the window's own state: the files, the content, the clock and the settings. */
const useShellContext = () => {
  const { content, shellFs } = useVfs()
  const { now, settings: store, prefersDark } = useServices()
  return useMemo(
    () => ({ fs: shellFs, content, now, settings: settingsView({ store, prefersDark }) }),
    [shellFs, content, now, store, prefersDark],
  )
}

/** What the window's effects run through: the desktop's windows and services, with exit closing this window. */
const useEffectHandlers = (windowId) => {
  const windowManager = useWindowManager()
  const { openExternal } = useServices()
  const logout = useDelayedLogout()
  const openLink = useOpenLinkDialog()
  const { play } = useMusicControls()
  return useMemo(
    () => ({ windowManager, openExternal, openLink, play, logout, closeSelf: () => windowManager.close(windowId) }),
    [windowManager, openExternal, openLink, play, logout, windowId],
  )
}

/**
 * A command's [y/N] question in this window: the answer or ^C is printed and sets $?.
 * @param {{ context: { fs: object, settings: object }, shell: { current: object }, append: Function }} options
 */
const useWindowQuestion = ({ context, shell, append }) => {
  const question = useQuestion(context)
  const settle = ({ lines, code }) => {
    shell.current = { ...shell.current, lastCode: code }
    append(lines)
  }
  return {
    question: question.question,
    ask: question.ask,
    answer: (input) => settle(question.answer(input)),
    cancel: (input) => settle(question.cancel(input)),
  }
}

/**
 * One terminal window's shell: its folder, variables and last exit code, the output log, and running lines through
 * exec() + effects.
 * @param {{ windowId: number, initialCwd: string }} options
 */
export const useTerminalSession = ({ windowId, initialCwd }) => {
  const { vfs } = useVfs()
  const context = useShellContext()
  const handlers = useEffectHandlers(windowId)
  const [cwd, setCwd] = useState(() => (initialCwd && isDir(vfs, initialCwd) ? initialCwd : START_DIR))
  // When this window's shell started: uptime counts from it
  const [startedAt] = useState(() => context.now())
  // Read and written within one keypress, so a ref rather than state
  const shell = useRef({ cwd, env: { PWD: cwd }, lastCode: 0 })
  const ownLines = useOwnLines(vfs)
  const log = useLog()
  const { append } = log
  const { ask, ...question } = useWindowQuestion({ context, shell, append })
  // Tells the caller whether the line ran `history -c`, so the ↑ list can forget too
  const run = useCallback((raw) => {
    const before = shell.current
    const history = record(context.fs, raw, ownLines)
    // The windows open as the line starts: ones it opens show on the next ps
    const processes = windowProcesses(handlers.windowManager.list(), windowId)
    const result = exec(raw, { ...context, cwd: before.cwd, env: before.env, lastCode: before.lastCode, history, startedAt, processes })
    shell.current = { cwd: result.cwd, env: result.env, lastCode: result.code }
    let historyCleared = false
    const clearHistory = () => {
      historyCleared = true
      ownLines.current = []
    }
    // Read after exec, so a file the line just made can be opened by it
    const { notes, clear } = applyTerminalEffects(result.effects, { ...handlers, clearHistory, ask, vfs: context.fs.vfs() })
    setCwd(result.cwd)
    const echoed = clear ? [] : [prompt(before.cwd, raw)]
    append([...echoed, ...result.lines, ...notes], { clearFirst: clear })
    return { historyCleared }
  }, [context, startedAt, handlers, append, windowId, ask, ownLines])
  // Ctrl+C at the prompt: the abandoned line is echoed with ^C and $? becomes 130
  const interrupt = useCallback((input) => {
    shell.current = { ...shell.current, lastCode: INTERRUPTED_CODE }
    append([prompt(shell.current.cwd, `${input}^C`)])
  }, [append])
  // The window's variables and $? as they are now, for Tab to fill in a typed `$HOME/` or `$OLDPWD/`
  const variables = useCallback(() => ({ env: { ...ENV, ...shell.current.env }, lastCode: shell.current.lastCode }), [])
  return { cwd, entries: log.entries, run, interrupt, variables, append, clear: log.clear, ...question }
}
