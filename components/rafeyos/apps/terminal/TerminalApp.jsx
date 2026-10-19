import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { tilde } from '@/components/rafeyos/core/vfs/paths'
import { useTerminalSession } from './logic/useTerminalSession'
import { STARTER_COMMAND, useTerminalKeys } from './logic/useTerminalKeys'
import { TerminalLine, TerminalPrompt } from './TerminalLine'
import { APP } from '@/components/rafeyos/core/catalog/apps'

// The mockup focuses the prompt just after the open animation starts
const FOCUS_DELAY_MS = 60

export const terminalTitle = (cwd) => `visitor@rafey: ${tilde(cwd)}`

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

/** The live prompt; the grey ghost shows until the first command. */
const PromptLine = ({ cwd, input, keys, inputRef }) => (
  <div className="tline">
    <TerminalPrompt cwd={cwd} />
    <span className="inp">
      <input
        ref={inputRef}
        value={input}
        onChange={keys.onChange}
        onKeyDown={keys.onKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-label="Terminal input"
      />
      {!keys.started && !input && (
        <span className="ghost tap" onClick={keys.runStarter} aria-hidden="true">
          {STARTER_COMMAND}
        </span>
      )}
    </span>
  </div>
)

/** GNOME Terminal running rafeyOS's pretend bash. */
export const TerminalApp = ({ windowId, arg }) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const session = useTerminalSession({ windowId, initialCwd: arg })
  const [input, setInput] = useState('')
  const keys = useTerminalKeys({ session, input, setInput, vfs })
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
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
      <div className="term" ref={scrollRef} onClick={focusInput}>
        <div className="tlog">
          {session.entries.map((entry) => (
            <TerminalLine key={entry.id} line={entry.line} />
          ))}
        </div>
        <PromptLine cwd={session.cwd} input={input} keys={keys} inputRef={inputRef} />
      </div>
    </>
  )
}
