import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { tilde } from '@/components/rafeyos/core/vfs/paths'
import { useTerminalSession } from './logic/useTerminalSession'
import { STARTER_COMMAND, useTerminalKeys } from './logic/useTerminalKeys'
import { useCursor } from './logic/useCursor'
import { TerminalLine, TerminalPrompt } from './TerminalLine'
import { APP } from '@/components/rafeyos/core/catalog/apps'

// The mockup focuses the prompt just after the open animation starts
const FOCUS_DELAY_MS = 60

export const terminalTitle = (cwd) => `visitor@rafey.ai: ${tilde(cwd)}`

const useAutoFocus = (inputRef) => {
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), FOCUS_DELAY_MS)
    return () => clearTimeout(timer)
  }, [inputRef])
}

const TerminalHeader = ({ title, onNewWindow }) => (
  <HeaderBar
    title={title}
    start={
      <button type="button" className="flat" aria-label="New Window" onClick={onNewWindow}>
        <Sym name="plus" />
      </button>
    }
    end={
      <>
        <button type="button" className="flat" aria-label="Find" disabled>
          <Sym name="search" />
        </button>
        <button type="button" className="flat" aria-label="Menu" disabled>
          <Sym name="menu" />
        </button>
      </>
    }
  />
)

/** The live prompt, or a command's [y/N] question waiting for its answer; the grey ghost shows until the first command. */
const PromptLine = ({ cwd, question, input, keys, cursor, inputRef }) => {
  const ghost = !keys.started && !input ? STARTER_COMMAND : ''
  return (
    <div className="tline">
      {question === null ? <TerminalPrompt cwd={cwd} /> : <span>{question} </span>}
      <span className="inp">
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => {
            keys.onChange(event)
            cursor.sync(event.target)
          }}
          onKeyDown={(event) => {
            cursor.markTyping()
            keys.onKeyDown(event)
          }}
          onSelect={(event) => cursor.sync(event.target)}
          onKeyUp={(event) => cursor.sync(event.target)}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label="Terminal input"
        />
        {ghost && (
          <span className="ghost tap" onClick={keys.runStarter} aria-hidden="true">
            {ghost}
          </span>
        )}
        {/* Sits on the ghost's first letter, which shows through inverted like a real block cursor */}
        <span className={`tcursor${cursor.isTyping ? ' is-typing' : ''}`} style={{ left: cursor.left }} aria-hidden="true">
          {ghost.charAt(0)}
        </span>
      </span>
    </div>
  )
}

/** GNOME Terminal running rafeyOS's bash. */
export const TerminalApp = ({ windowId, arg }) => {
  const { shellFs, vfs } = useVfs()
  const windowManager = useWindowManager()
  const session = useTerminalSession({ windowId, initialCwd: arg })
  const [input, setInput] = useState('')
  const keys = useTerminalKeys({ session, input, setInput, shellFs, vfs })
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const cursor = useCursor(inputRef, { input })
  const title = terminalTitle(session.cwd)
  useAutoFocus(inputRef)
  useEffect(() => windowManager.setTitle(windowId, title), [windowManager, windowId, title])
  useLayoutEffect(() => {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [session.entries])
  const focusInput = () => {
    if (!String(window.getSelection?.() ?? '')) inputRef.current?.focus({ preventScroll: true })
  }
  return (
    <>
      <TerminalHeader title={title} onNewWindow={() => windowManager.openApp(APP.TERMINAL, { path: session.cwd })} />
      <div className="term pane" ref={scrollRef} onClick={focusInput}>
        <div className="tlog">
          {session.entries.map((entry) => (
            <TerminalLine key={entry.id} line={entry.line} />
          ))}
        </div>
        <PromptLine cwd={session.cwd} question={session.question} input={input} keys={keys} cursor={cursor} inputRef={inputRef} />
      </div>
    </>
  )
}
