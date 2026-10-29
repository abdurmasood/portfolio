// nano in the homepage terminal: the buffer in the terminal's own font and colours, under a dim rule, with nano's
// status line and keys. It reads and writes through the shell's filesystem, so a save lands in the store /os shares.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { errnoText, failureErrno } from '@/components/rafeyos/core/commands/errors'
import { writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { normalize, resolve } from '@/components/rafeyos/core/vfs/paths'

const NEW_BUFFER = 'New Buffer'
const SAVE_QUESTION = 'Save modified buffer?  Y Yes  N No  ^C Cancel'
const FILE_NAME_PROMPT = 'File Name to Write'
const CANCELLED = '[ Cancelled ]'
const RULE = '────'
// Holds an empty status line's height, so the keys under it don't move
const EMPTY_STATUS = '\u00a0'

// What nano is asking at its status line, if anything
const ASKING = Object.freeze({ NOTHING: 'nothing', SAVE: 'save', FILE_NAME: 'fileName' })

const baseName = (path) => path.slice(path.lastIndexOf('/') + 1)

/** nano's count of a text's lines, a last one without its newline included: "1 line", "2 lines". */
const countLines = (text) => {
  const count = text.split(/(?<=\n)/).filter(Boolean).length
  return `${count} ${count === 1 ? 'line' : 'lines'}`
}

// nano ends a file it writes with a newline
const withFinalNewline = (text) => (text && !text.endsWith('\n') ? `${text}\n` : text)

/** A file's text through links, or null when there is none to read (a new file). */
const readText = (vfs, path) => {
  const found = path === null ? null : resolve(vfs, path, { followLast: true })
  const node = found?.ok ? vfs[found.path] : undefined
  return node && 'text' in node ? node.text : null
}

/** The buffer as nano opens it: the file's text, or empty for a new one, and what the status line says first. */
const openBuffer = (shellFs, path) => {
  const text = readText(shellFs.vfs(), path)
  if (text !== null) return { text, status: `[ Read ${countLines(text)} ]` }
  return { text: '', status: path === null ? '' : '[ New File ]' }
}

const isCtrl = (event, key) => event.ctrlKey && event.key.toLowerCase() === key

/** Calls `onDone` once, however many ways nano is left. */
const useFinish = (onDone) => {
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  return () => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current({})
  }
}

/** Writes the buffer to `target`; the status line reports how it went. Returns whether it was written. */
const writeBuffer = ({ shellFs, buffer, target }) => {
  const text = withFinalNewline(buffer.text)
  const outcome = shellFs.apply(writeFile, { path: target, text })
  if (!outcome.ok) {
    buffer.setStatus(`[ Error writing ${baseName(target)}: ${errnoText(failureErrno(outcome))} ]`)
    return false
  }
  buffer.setPath(target)
  buffer.setSaved(buffer.text)
  buffer.setStatus(`[ Wrote ${countLines(text)} ]`)
  return true
}

/** The buffer, its file and what nano is asking, with the actions its keys and taps run. */
const useNano = ({ path: openedPath, cwd, shellFs, onDone }) => {
  const [opened] = useState(() => openBuffer(shellFs, openedPath))
  const [path, setPath] = useState(openedPath)
  const [text, setText] = useState(opened.text)
  const [saved, setSaved] = useState(opened.text)
  const [status, setStatus] = useState(opened.status)
  const [asking, setAsking] = useState(ASKING.NOTHING)
  // Whether the file name being asked for is for ^X's save, which exits once written
  const exitAfterWrite = useRef(false)
  const finish = useFinish(onDone)
  const buffer = { text, setPath, setSaved, setStatus }

  const writeTo = (target) => {
    setAsking(ASKING.NOTHING)
    if (writeBuffer({ shellFs, buffer, target }) && exitAfterWrite.current) finish()
  }
  const save = ({ thenExit }) => {
    exitAfterWrite.current = thenExit
    if (path === null) setAsking(ASKING.FILE_NAME)
    else writeTo(path)
  }
  const cancel = () => {
    exitAfterWrite.current = false
    setAsking(ASKING.NOTHING)
    setStatus(CANCELLED)
  }
  return {
    name: path === null ? NEW_BUFFER : baseName(path),
    text,
    setText,
    status,
    asking,
    save: () => save({ thenExit: false }),
    exit: () => (text === saved ? finish() : setAsking(ASKING.SAVE)),
    answer: (yes) => (yes ? save({ thenExit: true }) : finish()),
    writeAs: (name) => (name ? writeTo(normalize(name, cwd)) : cancel()),
    cancel,
  }
}

/** The buffer's keys: ^O and ^S write, ^X exits; while asking to save, only Y, N and ^C count. */
const bufferKeyHandler = (nano) => (event) => {
  if (nano.asking === ASKING.SAVE) {
    event.preventDefault()
    if (isCtrl(event, 'c')) nano.cancel()
    else if (event.key.toLowerCase() === 'y' && !event.ctrlKey) nano.answer(true)
    else if (event.key.toLowerCase() === 'n' && !event.ctrlKey) nano.answer(false)
    return
  }
  if (isCtrl(event, 'o') || isCtrl(event, 's')) {
    event.preventDefault()
    nano.save()
  } else if (isCtrl(event, 'x')) {
    event.preventDefault()
    nano.exit()
  }
}

const fileNameKeyHandler = (nano) => (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    nano.writeAs(event.currentTarget.value.trim())
  } else if (isCtrl(event, 'c')) {
    event.preventDefault()
    nano.cancel()
  }
}

/** The status line: the last message, or the question being asked. */
const StatusLine = ({ nano, nameRef }) => {
  if (nano.asking === ASKING.SAVE) return <p className="nano-status dim">{SAVE_QUESTION}</p>
  if (nano.asking === ASKING.FILE_NAME) {
    return (
      <p className="nano-status dim">
        {`${FILE_NAME_PROMPT}: `}
        <input
          ref={nameRef}
          type="text"
          className="nano-file-name"
          aria-label={FILE_NAME_PROMPT}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          onKeyDown={fileNameKeyHandler(nano)}
        />
      </p>
    )
  }
  return <p className="nano-status dim">{nano.status || EMPTY_STATUS}</p>
}

// Phones have no Ctrl: the same choices as taps, for whatever nano is asking
const TAPS = Object.freeze({
  [ASKING.NOTHING]: (nano) => [['save', nano.save], ['exit', nano.exit]],
  [ASKING.SAVE]: (nano) => [['yes', () => nano.answer(true)], ['no', () => nano.answer(false)], ['cancel', nano.cancel]],
  [ASKING.FILE_NAME]: (nano) => [['cancel', nano.cancel]],
})

/** Sizes the buffer to its text as wrapped, so a long line that wraps isn't cut off. */
const useFitHeight = (bufferRef, text) => {
  useLayoutEffect(() => {
    const element = bufferRef.current
    // Collapsed first, so the height can shrink as well as grow
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [bufferRef, text])
}

const ActiveNano = ({ path, cwd, shellFs, onDone }) => {
  const nano = useNano({ path, cwd, shellFs, onDone })
  const bufferRef = useRef(null)
  const nameRef = useRef(null)
  useFitHeight(bufferRef, nano.text)

  // Focused here, not with autoFocus; the Enter that ran nano was kept from the page, so it never reaches the buffer
  useEffect(() => {
    const target = nano.asking === ASKING.FILE_NAME ? nameRef.current : bufferRef.current
    target?.focus()
  }, [nano.asking])

  return (
    <div className="terminal-block nano">
      <p className="nano-title dim">{`${RULE} ${nano.name} ${RULE}`}</p>
      <textarea
        ref={bufferRef}
        className="nano-buffer"
        aria-label="nano buffer"
        value={nano.text}
        rows={1}
        readOnly={nano.asking !== ASKING.NOTHING}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        onChange={(event) => nano.setText(event.target.value)}
        onKeyDown={bufferKeyHandler(nano)}
      />
      <StatusLine nano={nano} nameRef={nameRef} />
      <p className="nano-keys dim player-keys">^O Write Out   ^X Exit</p>
      <div className="player-taps">
        {TAPS[nano.asking](nano).map(([label, onTap]) => (
          <button key={label} type="button" onClick={onTap}>[ {label} ]</button>
        ))}
      </div>
    </div>
  )
}

/**
 * nano on `path` (null for a new buffer), against `cwd` for a name typed at its prompt. Once left it prints nothing.
 * @param {{ path: string | null, cwd: string, shellFs: import('@/components/rafeyos/core/vfs/shellFs').ShellFs,
 *   active: boolean, onDone: (props: object) => void }} props
 */
export const NanoEditor = ({ path, cwd, shellFs, active, onDone }) =>
  active ? <ActiveNano path={path} cwd={cwd} shellFs={shellFs} onDone={onDone} /> : null
