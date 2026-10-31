import { useRef, useState } from 'react'
import { complete } from '@/components/rafeyos/core/commands/complete'
import { COMPLETION_COMMANDS } from '@/components/rafeyos/core/commands/exec'
import { pre, prompt } from '@/components/rafeyos/core/commands/lines'
import { useCommandRecall } from '@/components/rafeyos/apps/terminal/logic/useCommandRecall'
import { answerKey } from '@/components/rafeyos/apps/terminal/logic/useQuestion'

// Runs as the first command; Tab, → or Enter on an empty prompt accepts it
export const STARTER_COMMAND = 'help'
const ACCEPTS_STARTER = new Set(['Tab', 'ArrowRight', 'Enter'])

/** Tab completion; a second Tab in a row lists the matches. */
const useTabCompletion = ({ session, input, setInput, shellFs }) => {
  const tabCount = useRef(0)
  return {
    tab: () => {
      tabCount.current += 1
      // The tree as it is right now, so a file the last line made completes at once
      const context = { ...session.variables(), vfs: shellFs.vfs(), cwd: session.cwd, commands: COMPLETION_COMMANDS, tabCount: tabCount.current }
      const outcome = complete(input, context)
      if (outcome.list) session.append([prompt(session.cwd, input), pre(outcome.list.join('  '))])
      else setInput(outcome.value)
    },
    reset: () => {
      tabCount.current = 0
    },
  }
}

/**
 * Keyboard handling for the terminal prompt.
 * @param {{ session: object, input: string, setInput: Function, shellFs: import('@/components/rafeyos/core/vfs/shellFs').ShellFs, vfs: object }} options
 * @returns {{ onKeyDown: Function, onChange: Function, started: boolean, runStarter: Function }}
 */
export const useTerminalKeys = ({ session, input, setInput, shellFs, vfs }) => {
  const history = useCommandRecall(shellFs, vfs)
  const completion = useTabCompletion({ session, input, setInput, shellFs })
  const [started, setStarted] = useState(false)
  const submit = (command) => {
    setStarted(true)
    setInput('')
    history.push(command)
    if (session.run(command).historyCleared) history.clear()
  }
  const keys = {
    Enter: () => submit(input),
    Tab: completion.tab,
    ArrowUp: () => {
      const command = history.older()
      if (command !== null) setInput(command)
    },
    ArrowDown: () => setInput(history.newer()),
  }
  const onKeyDown = (event) => {
    event.stopPropagation()
    if (session.question !== null && answerKey(event, { session, input, setInput })) return undefined
    if (!started && !input && ACCEPTS_STARTER.has(event.key)) {
      event.preventDefault()
      return submit(STARTER_COMMAND)
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      return session.clear()
    }
    // Ctrl+Shift+C is copy, so only a plain Ctrl+C interrupts
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      completion.reset()
      setInput('')
      return session.interrupt(input)
    }
    const handler = keys[event.key]
    if (!handler) return undefined
    // Enter too, as on the homepage: otherwise it goes on to click what the line focused (Open Link's Cancel)
    event.preventDefault()
    return handler()
  }
  const onChange = (event) => {
    completion.reset()
    setInput(event.target.value)
  }
  return { onKeyDown, onChange, started, runStarter: () => submit(STARTER_COMMAND) }
}
