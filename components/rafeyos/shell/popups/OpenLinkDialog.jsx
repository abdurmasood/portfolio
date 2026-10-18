import { useCallback, useRef } from 'react'
import { useShellDispatch, useVfs } from '../../state/logic/contexts'
import { displayLink } from '../../vfs/content'
import { useFocusTrap } from './logic/useFocusTrap'

export const OPEN_LINK_DIALOG = 'openLink'

/** "https://www.linkedin.com/in/x/" -> "linkedin.com/in/x", as the mockup words it. */
export const linkLabel = (url) => displayLink(url).replace(/^www\./, '')

/** Opens the "Open Link" dialog; for desktop links, Files and the terminal's `open linkedin`. */
export const useOpenLinkDialog = () => {
  const shellDispatch = useShellDispatch()
  return useCallback(() => shellDispatch({ type: 'openDialog', kind: OPEN_LINK_DIALOG }), [shellDispatch])
}

/** App-styled confirmation; Open is a real link so the browser opens it from the visitor's click. */
export const OpenLinkDialog = () => {
  const shellDispatch = useShellDispatch()
  const { linkedinUrl } = useVfs().content.contact
  const close = () => shellDispatch({ type: 'closeDialog' })
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef)
  return (
    <div className="modal" onClick={(event) => event.target === event.currentTarget && close()}>
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
