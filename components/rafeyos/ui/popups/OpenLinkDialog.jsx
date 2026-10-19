import { useCallback, useRef } from 'react'
import { useShellDispatch, useVfs } from '@/components/rafeyos/state/logic/contexts'
import { displayLink } from '@/components/rafeyos/core/vfs/content'
import { useFocusTrap } from '@/components/rafeyos/ui/popups/logic/useFocusTrap'
import { SHELL_ACTIONS } from '@/components/rafeyos/state/logic/shellReducer'
import { KEEPS_POPUP_PROPS } from '@/components/rafeyos/ui/logic/domHooks'

export const OPEN_LINK_DIALOG = 'openLink'

/** "https://www.linkedin.com/in/x/" -> "linkedin.com/in/x", as the mockup words it. */
export const linkLabel = (url) => displayLink(url).replace(/^www\./, '')

/** Opens the "Open Link" dialog; for desktop links, Files and the terminal's `open linkedin`. */
export const useOpenLinkDialog = () => {
  const shellDispatch = useShellDispatch()
  return useCallback(() => shellDispatch({ type: SHELL_ACTIONS.OPEN_DIALOG, kind: OPEN_LINK_DIALOG }), [shellDispatch])
}

/** App-styled confirmation; Open is a real link so the browser opens it from the visitor's click. */
export const OpenLinkDialog = () => {
  const shellDispatch = useShellDispatch()
  const { linkedinUrl } = useVfs().content.contact
  const close = () => shellDispatch({ type: SHELL_ACTIONS.CLOSE_DIALOG })
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)
  return (
    <div className="modal" {...KEEPS_POPUP_PROPS} onClick={(event) => event.target === event.currentTarget && close()}>
      <div ref={dialogRef} className="dlg app" role="dialog" aria-modal="true" aria-label="Open Link">
        <h3>Open Link</h3>
        <p className="db">{`${linkLabel(linkedinUrl)} will open in your web browser.`}</p>
        <div className="acts">
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <a className="btn sugg" href={linkedinUrl} target="_blank" rel="noopener" onClick={close}>
            Open
          </a>
        </div>
      </div>
    </div>
  )
}
