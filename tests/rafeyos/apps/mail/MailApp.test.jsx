// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { clickDock, headerTitle, renderDesktop, windowsOf } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { realContent } from '@/tests/rafeyos/helpers/testVfs'

// jsdom can't follow a mailto link; the app's own click handler still runs before this
const blockNavigation = (event) => event.preventDefault()
beforeEach(() => document.addEventListener('click', blockNavigation))
afterEach(() => {
  document.removeEventListener('click', blockNavigation)
  cleanup()
})

const { email, defaultMail } = realContent.contact

const openMail = (overrides) => {
  const view = renderDesktop(overrides)
  clickDock('Mail')
  const [win] = windowsOf(view.container, 'mail')
  return { ...view, win, ui: within(win) }
}

describe('Mail', () => {
  it('starts a message to Rafey with the default subject and body', () => {
    const { win, ui } = openMail()

    expect(ui.getByText('visitor')).toBeTruthy()
    expect(ui.getByText(`Rafey Masood <${email}>`)).toBeTruthy()
    expect(ui.getByLabelText('Subject').value).toBe(defaultMail.subject)
    expect(ui.getByLabelText('Message').value).toBe(defaultMail.body)
    expect(headerTitle(win)).toBe(`Write: ${defaultMail.subject}`)
  })

  it('builds the Send link from the current subject and body', () => {
    const { win, ui } = openMail()

    fireEvent.change(ui.getByLabelText('Subject'), { target: { value: 'Hello & bye' } })
    fireEvent.change(ui.getByLabelText('Message'), { target: { value: 'Line one\nLine two?' } })

    const send = ui.getByRole('link', { name: 'Send' })
    expect(send.getAttribute('href')).toBe(`mailto:${email}?subject=Hello%20%26%20bye&body=Line%20one%0ALine%20two%3F`)
    expect(send.getAttribute('target')).toBe('_blank')
    expect(headerTitle(win)).toBe('Write: Hello & bye')
    expect(win.getAttribute('aria-label')).toBe('Write: Hello & bye')
  })

  it('copies the address and explains the hand-off on Send, never claiming it was sent', () => {
    const { services, ui } = openMail()

    fireEvent.click(ui.getByRole('link', { name: 'Send' }))

    expect(services.clipboard.writeText).toHaveBeenCalledWith(email)
    const note = ui.getByRole('status')
    expect(note.textContent).toBe(`Handing this message to your mail app. If nothing opens, write to ${email} (copied).`)
    expect(note.textContent).not.toMatch(/\bsent\b/i)
  })

  it('shrugs off a clipboard that refuses or is missing', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('denied')))
    const { ui } = openMail({ clipboard: { writeText } })

    fireEvent.click(ui.getByRole('link', { name: 'Send' }))

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(ui.getByRole('status')).toBeTruthy()
  })

  it('keeps attach and the menu disabled', () => {
    const { ui } = openMail()

    expect(ui.getByRole('button', { name: 'Attach' }).disabled).toBe(true)
    expect(ui.getByRole('button', { name: 'Menu' }).disabled).toBe(true)
  })
})
