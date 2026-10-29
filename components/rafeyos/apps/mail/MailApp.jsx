import { useEffect, useId, useState } from 'react'
import { useServices, useVfs, useWindowManager } from '@/components/rafeyos/state/logic/contexts'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { copyQuietly } from '@/components/rafeyos/core/services/clipboard'

export const mailTitle = (subject) => `Write: ${subject}`

/** Never claims the message went: the visitor's own mail app does the sending, if it opens. */
const HandoffNote = ({ email }) => (
  <div className="infobar" role="status">
    <span>
      Handing this message to your mail app. If nothing opens, write to <b className="seltext">{email}</b> (copied).
    </span>
    <span className="sp" />
  </div>
)

const MailHeader = ({ subject, href, onSend }) => (
  <HeaderBar
    title={mailTitle(subject)}
    start={
      <a className="btn sugg" href={href} target="_blank" rel="noopener" onClick={onSend}>
        <Sym name="send" />
        Send
      </a>
    }
    end={
      <>
        <button type="button" className="flat" aria-label="Attach" disabled>
          <Sym name="plus" />
        </button>
        <button type="button" className="flat" aria-label="Menu" disabled>
          <Sym name="menu" />
        </button>
      </>
    }
  />
)

const Field = ({ label, htmlFor, children }) => (
  <div className="mf">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
  </div>
)

/** A compose window to Rafey. Send is a real mailto link built from the current subject and body. */
export const MailApp = ({ windowId }) => {
  const { contact } = useVfs().content
  const { clipboard } = useServices()
  const windowManager = useWindowManager()
  const subjectId = useId()
  const [subject, setSubject] = useState(contact.defaultMail.subject)
  const [body, setBody] = useState(contact.defaultMail.body)
  const [handedOff, setHandedOff] = useState(false)
  const title = mailTitle(subject)
  useEffect(() => windowManager.setTitle(windowId, title), [windowManager, windowId, title])
  const send = () => {
    copyQuietly(clipboard, contact.email)
    setHandedOff(true)
  }
  return (
    <>
      <MailHeader subject={subject} href={contact.mailtoFor({ subject, body })} onSend={send} />
      {handedOff && <HandoffNote email={contact.email} />}
      <Field label="From">
        <span className="seltext">visitor</span>
      </Field>
      <Field label="To">
        <span className="chip seltext">
          <i>R</i>
          {`Rafey Masood <${contact.email}>`}
        </span>
      </Field>
      <Field label="Subject" htmlFor={subjectId}>
        <input id={subjectId} value={subject} onChange={(event) => setSubject(event.target.value)} />
      </Field>
      <div className="mbody pane">
        <textarea aria-label="Message" value={body} onChange={(event) => setBody(event.target.value)} />
      </div>
    </>
  )
}
