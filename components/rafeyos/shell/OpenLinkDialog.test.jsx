// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { clickDock, renderDesktop, windowsOf } from '../testing/renderRafeyOS'
import { linkLabel } from './OpenLinkDialog'

const blockNavigation = (event) => event.preventDefault()
beforeEach(() => document.addEventListener('click', blockNavigation))
afterEach(() => {
  document.removeEventListener('click', blockNavigation)
  cleanup()
})

const LINKEDIN = 'https://www.linkedin.com/in/arafeymasood/'

const openLinkedInFile = () => {
  const view = renderDesktop()
  clickDock('Files')
  const [files] = windowsOf(view.container, 'files')
  fireEvent.doubleClick(files.querySelector('.fbody [data-path="~/contact"]'))
  fireEvent.doubleClick(files.querySelector('.fbody [data-path="~/contact/linkedin.desktop"]'))
  return view
}

describe('Open Link dialog', () => {
  it('asks before a web link opens, with a real link to open it', () => {
    openLinkedInFile()

    const dialog = screen.getByRole('dialog', { name: 'Open Link' })
    expect(dialog.className).toBe('dlg app')
    expect(dialog.textContent).toContain('linkedin.com/in/arafeymasood will open in your web browser.')
    const open = within(dialog).getByRole('link', { name: 'Open' })
    expect(open.getAttribute('href')).toBe(LINKEDIN)
    expect(open.getAttribute('target')).toBe('_blank')
    expect(open.getAttribute('rel')).toBe('noopener')
  })

  it('closes when Open is followed', () => {
    openLinkedInFile()

    fireEvent.click(screen.getByRole('link', { name: 'Open' }))

    expect(screen.queryByRole('dialog', { name: 'Open Link' })).toBeNull()
  })

  it('closes on Cancel, opening nothing', () => {
    const { services } = openLinkedInFile()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Open Link' })).toBeNull()
    expect(services.openExternal).not.toHaveBeenCalled()
  })

  it('closes on a backdrop click', () => {
    openLinkedInFile()

    fireEvent.click(document.querySelector('.modal'))

    expect(screen.queryByRole('dialog', { name: 'Open Link' })).toBeNull()
  })

  it('shows URLs without scheme, www or trailing slash', () => {
    expect(linkLabel(LINKEDIN)).toBe('linkedin.com/in/arafeymasood')
    expect(linkLabel('https://a.example/x')).toBe('a.example/x')
  })
})
