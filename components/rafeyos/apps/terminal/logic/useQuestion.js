import { useState } from 'react'
import { EFFECTS } from '@/components/rafeyos/core/commands/exec'
import { error, pre } from '@/components/rafeyos/core/commands/lines'
import { isYes, resetVisitorHome } from '@/components/rafeyos/core/commands/builtins/resetHome'
import { localStorageOrNull } from '@/lib/browserStorage'
import { HOME_CWD_KEY } from '@/lib/storageKeys'

// What Ctrl+C leaves in $?: 128 + SIGINT
const INTERRUPTED_CODE = 130
const FAILURE = 1
// Keys that would complete or recall a line, inert while a question waits
const INERT_WHILE_ASKING = new Set(['Tab', 'ArrowUp', 'ArrowDown'])

/** The homepage's saved folder goes with the rest, so its next load starts in ~. */
const forgetHomeFolder = () => {
  try {
    localStorageOrNull()?.removeItem(HOME_CWD_KEY)
  } catch {
    // Blocked storage: no folder was saved either
  }
}

/**
 * Runs a confirmed question's effects. A reset that storage refuses prints why, with code 1, and stops there.
 * @param {readonly import('@/components/rafeyos/core/commands/builtins/result').Effect[]} effects
 * @param {Parameters<typeof resetVisitorHome>[0]} deps
 */
const confirm = (effects, deps) => {
  for (const effect of effects) {
    if (effect.type !== EFFECTS.RESET_HOME) throw new Error(`Unknown answer effect: ${effect.type}`)
    const refused = resetVisitorHome(deps)
    if (refused) return { lines: [error(refused)], code: FAILURE }
    forgetHomeFolder()
  }
  return { lines: [], code: 0 }
}

/**
 * A [y/N] question a command asked (an `ask` effect), shared by both terminals. While it waits, the prompt shows the
 * question and the next Enter answers it; the answer is echoed after the question and never reaches the history.
 * `answer` and `cancel` return the lines to print and the new $?.
 * @param {Parameters<typeof resetVisitorHome>[0]} deps the files and settings a confirmed reset wipes
 */
export const useQuestion = (deps) => {
  const [asking, setAsking] = useState(null)
  return {
    question: asking?.question ?? null,
    ask: setAsking,
    answer: (input) => {
      setAsking(null)
      const outcome = isYes(input) ? confirm(asking.onYes, deps) : { lines: [], code: 0 }
      return { lines: [pre(`${asking.question} ${input}`), ...outcome.lines], code: outcome.code }
    },
    cancel: (input) => {
      setAsking(null)
      return { lines: [pre(`${asking.question} ${input}^C`)], code: INTERRUPTED_CODE }
    },
  }
}

/**
 * The keys a waiting question takes, in either terminal: Enter answers it and Ctrl+C cancels it, neither touching the
 * history; Tab, ↑ and ↓ do nothing. Returns whether it took the key.
 * @param {KeyboardEvent} event
 * @param {{ session: { answer: Function, cancel: Function }, input: string, setInput: Function }} prompt
 */
export const answerKey = (event, { session, input, setInput }) => {
  const cancels = event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'c'
  const answers = event.key === 'Enter'
  if (!cancels && !answers && !INERT_WHILE_ASKING.has(event.key)) return false
  // Also keeps Enter from reaching whatever the answer changes
  event.preventDefault()
  if (!cancels && !answers) return true
  setInput('')
  if (cancels) session.cancel(input)
  else session.answer(input)
  return true
}
