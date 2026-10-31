import { useEffect, useRef, useState } from 'react'

const TYPING_IDLE_MS = 500

/**
 * The block cursor's place and blink, kept in step with the native caret it replaces.
 * Shared by the homepage terminal and rafeyOS's Terminal.
 * @returns {{ caretIndex: number, left: string, isTyping: boolean, sync: Function, markTyping: Function }}
 */
export const useCursor = (inputRef, { input, foregroundId }) => {
  const [caretIndex, setCaretIndex] = useState(0)
  const [inputScrollLeft, setInputScrollLeft] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)

  const sync = (inputElement) => {
    setCaretIndex(inputElement.selectionStart ?? inputElement.value.length)
    setInputScrollLeft(inputElement.scrollLeft)
  }

  // Programmatic input changes (history, tab completion) move the native caret to the end.
  // Also re-sync when the prompt remounts after a foreground program, which may exit by tap with no keyup.
  useEffect(() => {
    if (inputRef.current) {
      setCaretIndex(inputRef.current.selectionStart ?? inputRef.current.value.length)
      setInputScrollLeft(inputRef.current.scrollLeft)
    }
  }, [inputRef, input, foregroundId])

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), [])

  const markTyping = () => {
    setIsTyping(true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_IDLE_MS)
  }

  return { caretIndex, left: `calc(${caretIndex}ch - ${inputScrollLeft}px)`, isTyping, sync, markTyping }
}
