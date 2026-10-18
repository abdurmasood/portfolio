import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMusicControls, useServices, useSessionDispatch, useVfs, useWindowManager } from '../../../state/logic/contexts'
import { exec } from '../../../terminal/exec'
import { prompt } from '../../../terminal/lines'
import { SESSION_EVENTS } from '../../../session/logic/sessionMachine'
import { isDir } from '../../../vfs/queries'
import { HOME } from '../../../vfs/buildVfs'
import { applyTerminalEffects } from './terminalEffects'
import { useOpenLinkDialog } from '../../../shell/popups/OpenLinkDialog'

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
 * One terminal window's shell: cwd, output log, and running commands through exec() + effects.
 * @param {{ windowId: number, initialCwd: string }} options
 */
export const useTerminalSession = ({ windowId, initialCwd }) => {
  const { vfs, content } = useVfs()
  const windowManager = useWindowManager()
  const { openExternal } = useServices()
  const logout = useDelayedLogout()
  const openLink = useOpenLinkDialog()
  const { play } = useMusicControls()
  const [cwd, setCwd] = useState(() => (initialCwd && isDir(vfs, initialCwd) ? initialCwd : HOME))
  const cwdRef = useRef(cwd)
  const log = useLog()
  const handlers = useMemo(
    () => ({ vfs, windowManager, openExternal, openLink, play, logout, closeSelf: () => windowManager.close(windowId) }),
    [vfs, windowManager, openExternal, openLink, play, logout, windowId],
  )
  const { append } = log
  const run = useCallback((raw) => {
    const before = cwdRef.current
    const result = exec(raw.trim(), { vfs, cwd: before, content })
    const { notes, clear } = applyTerminalEffects(result.effects, handlers)
    cwdRef.current = result.cwd
    setCwd(result.cwd)
    const echoed = clear ? [] : [prompt(before, raw)]
    append([...echoed, ...result.lines, ...notes], { clearFirst: clear })
  }, [vfs, content, handlers, append])
  return { cwd, entries: log.entries, run, append, clear: log.clear }
}
