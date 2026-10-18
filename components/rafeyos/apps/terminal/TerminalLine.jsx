import { memo } from 'react'
import { LINE_TYPES, ENTRY_KINDS } from '@/components/rafeyos/core/commands/lines'
import { tilde } from '@/components/rafeyos/core/vfs/paths'

/** Ubuntu's bash prompt: green user@host, blue path. */
export const TerminalPrompt = ({ cwd }) => (
  <span>
    <span className="pg">visitor@rafey</span>:<span className="pb">{tilde(cwd)}</span>${' '}
  </span>
)

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

const RENDERERS = Object.freeze({
  [LINE_TYPES.PRE]: ({ line }) => <pre>{line.text}</pre>,
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
})

/** One structured output line as React elements (no HTML strings). */
export const TerminalLine = memo(function TerminalLine({ line }) {
  const Render = RENDERERS[line.type]
  if (!Render) throw new Error(`Unknown terminal line type: ${line.type}`)
  return <Render line={line} />
})
