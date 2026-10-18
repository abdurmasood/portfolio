import { useCallback, useRef } from 'react'
import { useSessionDispatch, useShellDispatch } from '@/components/rafeyos/state/logic/contexts'
import { POWER_DIALOGS, POWER_DIALOG_SECONDS } from './logic/powerDialogs'
import { useCountdown } from './logic/useCountdown'
import { useFocusTrap } from '@/components/rafeyos/ui/popups/logic/useFocusTrap'

const ActionButton = ({ action, onRun }) => (
  <button type="button" className={`btn ${action.className}`.trim()} onClick={() => onRun(action.event)}>
    {action.label}
  </button>
)

/** A shell dialog with a 60s countdown; confirming (or reaching zero) sends its session event. */
export const PowerDialog = ({ kind }) => {
  const dialog = POWER_DIALOGS[kind]
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)
  const shellDispatch = useShellDispatch()
  const sessionDispatch = useSessionDispatch()
  const cancel = () => shellDispatch({ type: 'closeDialog' })
  const run = useCallback(
    (event) => {
      shellDispatch({ type: 'closeDialog' })
      sessionDispatch(event)
    },
    [shellDispatch, sessionDispatch],
  )
  const confirm = useCallback(() => run(dialog.confirm.event), [run, dialog])
  const seconds = useCountdown(POWER_DIALOG_SECONDS, confirm)
  return (
    <div className="modal" onClick={(event) => event.target === event.currentTarget && cancel()}>
      <div ref={dialogRef} className="dlg shell" role="dialog" aria-modal="true" aria-label={dialog.title}>
        <h3>{dialog.title}</h3>
        <p className="db">{dialog.body(seconds)}</p>
        <div className="acts">
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
          {dialog.extra.map((action) => (
            <ActionButton key={action.label} action={action} onRun={run} />
          ))}
          <ActionButton action={dialog.confirm} onRun={run} />
        </div>
      </div>
    </div>
  )
}
