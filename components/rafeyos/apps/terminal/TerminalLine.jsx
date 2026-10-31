import { memo } from 'react'
import { LINE_TYPES, ENTRY_KINDS, fetchRows } from '@/components/rafeyos/core/commands/lines'
import { tilde } from '@/components/rafeyos/core/vfs/paths'

/** The homepage terminal's prompt: user and host coloured, @ and the path plain. */
export const TerminalPrompt = ({ cwd }) => (
  <span>
    <span className="pg"><span className="pu">visitor</span>@<span className="ph">rafey.ai</span></span>:<span className="cwd">{tilde(cwd)}</span>${' '}
  </span>
)

// A block drops the newline it ends with, so one more keeps a trailing blank row on screen, as a terminal shows it
const shownText = (text) => (text.endsWith('\n') ? `${text}\n` : text)

const ENTRY_CLASS = Object.freeze({ [ENTRY_KINDS.DIR]: 'pb', [ENTRY_KINDS.LINK]: 'lc', [ENTRY_KINDS.FILE]: undefined })

const LsLine = ({ entries }) => (
  <pre>
    {entries.map((entry, i) => (
      <span key={entry.name}>
        {i > 0 && '  '}
        <span className={ENTRY_CLASS[entry.kind]}>{entry.name}</span>
      </span>
    ))}
  </pre>
)

/** neofetch's block: the logo and labels in the desktop's accent. */
const FetchLine = ({ line }) => (
  <div className="fetch">
    {fetchRows(line).map((row, i) => (
      <pre key={i}>
        <span className="ac">{row.logo}</span>
        {row.label !== undefined && <span className="ac">{row.label}</span>}
        {row.label !== undefined && ': '}
        {row.text}
      </pre>
    ))}
  </div>
)

const RENDERERS = Object.freeze({
  [LINE_TYPES.PRE]: ({ line }) => <pre>{shownText(line.text)}</pre>,
  [LINE_TYPES.ERROR]: ({ line }) => <div className="er">{line.text}</div>,
  [LINE_TYPES.DIM]: ({ line }) => <div className="dm">{line.text}</div>,
  [LINE_TYPES.LINK]: ({ line }) => (
    <div>
      <a href={line.href} target="_blank" rel="noopener noreferrer">
        {line.text}
      </a>
    </div>
  ),
  [LINE_TYPES.LS]: ({ line }) => <LsLine entries={line.entries} />,
  [LINE_TYPES.PROMPT]: ({ line }) => (
    <div>
      <TerminalPrompt cwd={line.cwd} />
      {line.cmd}
    </div>
  ),
  [LINE_TYPES.FETCH]: FetchLine,
})

/** One structured output line as React elements (no HTML strings). */
export const TerminalLine = memo(function TerminalLine({ line }) {
  const Render = RENDERERS[line.type]
  if (!Render) throw new Error(`Unknown terminal line type: ${line.type}`)
  return <Render line={line} />
})
