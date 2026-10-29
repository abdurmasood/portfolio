import { useRef, useState } from 'react'
import { complete } from '@/components/rafeyos/core/commands/complete'
import { historyLines } from '@/components/rafeyos/core/commands/history'
import { COMPLETION_COMMANDS } from '@/components/rafeyos/core/commands/exec'
import { pre, prompt } from '@/components/rafeyos/core/commands/lines'

// Runs as the first command; Tab, → or Enter on an empty prompt accepts it
export const STARTER_COMMAND = 'help'
const ACCEPTS_STARTER = new Set(['Tab', 'ArrowRight', 'Enter'])

/**
 * Bash-style history: ↑ walks back, ↓ forward, past the newest clears the line. It walks ~/.bash_history as it was
 * when the window opened, then this window's own lines; other windows' later lines show only in `history`.
 */
const useHistory = (vfs) => {
  const [snapshot] = useState(() => historyLines(vfs))
  const items = useRef(snapshot)
  const index = useRef(snapshot.length)
  return {
    push: (command) => {
      if (command.trim()) items.current = [...items.current, command]
      index.current = items.current.length
    },
    older: () => (index.current > 0 ? items.current[--index.current] : null),
    newer: () => {
      index.current = Math.min(items.current.length, index.current + 1)
      return items.current[index.current] ?? ''
    },
  }
}

/**
 * Keyboard handling for the terminal prompt.
 * @param {{ session: object, input: string, setInput: Function, vfs: object }} options
 * @returns {{ onKeyDown: Function, onChange: Function, started: boolean, runStarter: Function }}
 */
export const useTerminalKeys = ({ session, input, setInput, vfs }) => {
  const history = useHistory(vfs)
  const tabCount = useRef(0)
  const [started, setStarted] = useState(false)
  const submit = (command) => {
    setStarted(true)
    setInput('')
    history.push(command)
    session.run(command)
  }
  const tab = () => {
    tabCount.current += 1
    const outcome = complete(input, { vfs, cwd: session.cwd, commands: COMPLETION_COMMANDS, tabCount: tabCount.current })
    if (outcome.list) session.append([prompt(session.cwd, input), pre(outcome.list.join('  '))])
    else setInput(outcome.value)
  }
  const keys = {
    Enter: () => submit(input),
    Tab: tab,
    ArrowUp: () => {
      const command = history.older()
      if (command !== null) setInput(command)
    },
    ArrowDown: () => setInput(history.newer()),
  }
  const onKeyDown = (event) => {
    event.stopPropagation()
    if (!started && !input && ACCEPTS_STARTER.has(event.key)) {
      event.preventDefault()
      return submit(STARTER_COMMAND)
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      return session.clear()
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      tabCount.current = 0
      setInput('')
      return session.interrupt(input)
    }
    const handler = keys[event.key]
    if (!handler) return undefined
    if (event.key !== 'Enter') event.preventDefault()
    return handler()
  }
  const onChange = (event) => {
    tabCount.current = 0
    setInput(event.target.value)
  }
  return { onKeyDown, onChange, started, runStarter: () => submit(STARTER_COMMAND) }
}
