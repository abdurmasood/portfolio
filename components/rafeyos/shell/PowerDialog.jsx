import { useCallback } from 'react'
import { useSessionDispatch, useShellDispatch } from '../state/contexts'
import { POWER_DIALOGS, POWER_DIALOG_SECONDS } from './powerDialogs'
import { useCountdown } from './useCountdown'

/** A shell dialog with a 60s countdown; confirming (or reaching zero) ends the session. */
export const PowerDialog = ({ kind }) => {
  const dialog = POWER_DIALOGS[kind]
  const shellDispatch = useShellDispatch()
  const sessionDispatch = useSessionDispatch()
  const cancel = () => shellDispatch({ type: 'closeDialog' })
  const confirm = useCallback(() => {
    shellDispatch({ type: 'closeDialog' })
    sessionDispatch(dialog.confirm.event)
  }, [shellDispatch, sessionDispatch, dialog])
  const seconds = useCountdown(POWER_DIALOG_SECONDS, confirm)
  return (
    <div className="modal" onClick={(event) => event.target === event.currentTarget && cancel()}>
      <div className="dlg shell" role="dialog" aria-label={dialog.title}>
        <h3>{dialog.title}</h3>
        <p className="db">{dialog.body(seconds)}</p>
        <div className="acts">
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className={`btn ${dialog.confirm.className}`} onClick={confirm}>
            {dialog.confirm.label}
          </button>
        </div>
      </div>
    </div>
  )
}
