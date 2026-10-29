import { useRef, useState } from 'react'
import { historyLines } from '@/components/rafeyos/core/commands/history'

/**
 * Bash-style history: ↑ walks back, ↓ forward, past the newest clears the line. It walks ~/.bash_history as it was
 * when the window opened, then this window's own lines; other windows' later lines show only in `history`, and
 * `history -c` empties it.
 */
export const useCommandRecall = (shellFs) => {
  const [snapshot] = useState(() => historyLines(shellFs.vfs()))
  const items = useRef(snapshot)
  const index = useRef(snapshot.length)
  return {
    push: (command) => {
      if (command.trim()) items.current = [...items.current, command]
      index.current = items.current.length
    },
    clear: () => {
      items.current = []
      index.current = 0
    },
    older: () => (index.current > 0 ? items.current[--index.current] : null),
    newer: () => {
      index.current = Math.min(items.current.length, index.current + 1)
      return items.current[index.current] ?? ''
    },
  }
}
