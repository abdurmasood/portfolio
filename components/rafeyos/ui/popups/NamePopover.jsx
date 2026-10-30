import { useLayoutEffect, useRef, useState } from 'react'
import { useLayout, useShellDispatch, useVfs } from '@/components/rafeyos/state/logic/contexts'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { joinPath } from '@/components/rafeyos/core/vfs/paths'
import { KEEPS_POPUP_PROPS } from '@/components/rafeyos/ui/logic/domHooks'
import { useReturnFocus } from '@/components/rafeyos/ui/popups/logic/useFocusTrap'
import { useNameSelection } from './logic/useNameSelection'
import { checkName } from './logic/nameValidation'
import { popoverPosition } from './logic/popoverPosition'

/** New Folder and Rename's popup kind; the popup carries the prompt. */
export const NAME_POPUP = 'name'

/**
 * What the popover asks: title and actionLabel word it; folder is where the name goes, and original the path being
 * renamed (null for a new item). onSubmit acts on a checked name and returns a message to show instead of closing.
 * @typedef {{
 *   title: string, actionLabel: string, initial: string, isFolder: boolean, folder: string, original: string | null,
 *   onSubmit: (name: string) => string | null,
 * }} NamePrompt
 */

/** Measures before paint, then sits under (or over) the anchor with its arrow pointing at it. */
const usePlacement = (ref, anchor) => {
  const { viewport } = useLayout()
  useLayoutEffect(() => {
    const element = ref.current
    const placed = popoverPosition(anchor, { w: element.offsetWidth, h: element.offsetHeight }, viewport)
    element.style.left = `${placed.left}px`
    element.style.top = `${placed.top}px`
    element.style.setProperty('--arrow-x', `${placed.arrowX}px`)
    element.classList.toggle('above', placed.above)
  }, [ref, anchor, viewport])
}

/**
 * Nautilus's name popover, for New Folder and Rename: checks the name as it is typed and keeps the button off until
 * it would work. Escape and a press outside close it, as any shell popup.
 * @param {{ anchor: { x: number, y: number, w: number, h: number }, prompt: NamePrompt }} props
 */
export const NamePopover = ({ anchor, prompt }) => {
  const { vfs } = useVfs()
  const shellDispatch = useShellDispatch()
  const ref = useRef(null)
  const inputRef = useNameSelection({ wholeName: prompt.isFolder })
  const [name, setName] = useState(prompt.initial)
  const [refusal, setRefusal] = useState(null)
  usePlacement(ref, anchor)
  useReturnFocus({ onlyIfLost: true })
  const target = joinPath(prompt.folder, name)
  const existing = target === prompt.original ? undefined : vfs[target]
  const check = checkName(name, { isFolder: prompt.isFolder, existing })
  const message = refusal ?? check.message
  const submit = (event) => {
    event.preventDefault()
    if (!check.ok) return
    const refused = prompt.onSubmit(name)
    if (refused) setRefusal(refused)
    else shellDispatch({ type: SHELL_ACTIONS.CLOSE_POPUP })
  }
  return (
    <form ref={ref} className="pop namepop" {...KEEPS_POPUP_PROPS} role="dialog" aria-label={prompt.title} onSubmit={submit}>
      <h3>{prompt.title}</h3>
      <div className="namerow">
        <input
          ref={inputRef}
          aria-label={prompt.isFolder ? 'Folder name' : 'File name'}
          value={name}
          spellCheck={false}
          onChange={(event) => {
            setName(event.target.value)
            setRefusal(null)
          }}
        />
        <button type="submit" className="btn sugg" disabled={!check.ok || Boolean(refusal)}>
          {prompt.actionLabel}
        </button>
      </div>
      {message && <p className={check.ok && !refusal ? 'note' : 'note err'} role="status">{message}</p>}
    </form>
  )
}
