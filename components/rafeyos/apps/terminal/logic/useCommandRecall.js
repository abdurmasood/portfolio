import { useCallback, useEffect, useRef, useState } from 'react'
import { HISTORY_FILE, historyLines } from '@/components/rafeyos/core/commands/history'

/**
 * Calls `onWiped` when ~/.bash_history goes from there to gone (reset-home, or rm), so every open terminal forgets
 * its lines too.
 * @param {import('@/components/rafeyos/core/vfs/buildVfs').Vfs} vfs the tree as the terminal renders it
 * @param {() => void} onWiped
 */
const useHistoryWiped = (vfs, onWiped) => {
  const present = Object.hasOwn(vfs, HISTORY_FILE)
  const wasPresent = useRef(present)
  useEffect(() => {
    if (wasPresent.current && !present) onWiped()
    wasPresent.current = present
  }, [present, onWiped])
}

/**
 * A terminal's own lines since it opened or last ran `history -c`: what `history` lists when the file can't be
 * written. They go when the file does.
 * @param {import('@/components/rafeyos/core/vfs/buildVfs').Vfs} vfs
 * @returns {{ current: string[] }}
 */
export const useOwnLines = (vfs) => {
  const ownLines = useRef([])
  useHistoryWiped(vfs, useCallback(() => {
    ownLines.current = []
  }, []))
  return ownLines
}

/**
 * Bash-style history: ↑ walks back, ↓ forward, past the newest clears the line. It walks ~/.bash_history as it was
 * when the window opened, then this window's own lines; other windows' later lines show only in `history`, and
 * `history -c` or the file going away empties it.
 */
export const useCommandRecall = (shellFs, vfs = shellFs.vfs()) => {
  const [snapshot] = useState(() => historyLines(shellFs.vfs()))
  const items = useRef(snapshot)
  const index = useRef(snapshot.length)
  const clear = () => {
    items.current = []
    index.current = 0
  }
  useHistoryWiped(vfs, clear)
  return {
    push: (command) => {
      if (command.trim()) items.current = [...items.current, command]
      index.current = items.current.length
    },
    clear,
    older: () => (index.current > 0 ? items.current[--index.current] : null),
    newer: () => {
      index.current = Math.min(items.current.length, index.current + 1)
      return items.current[index.current] ?? ''
    },
  }
}
