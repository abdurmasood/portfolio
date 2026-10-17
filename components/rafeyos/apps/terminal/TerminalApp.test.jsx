// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { openTerminal, renderDesktop, settle, typeCommand, windowsOf } from '../../testing/renderRafeyOS'

afterEach(cleanup)

const log = (win) => win.querySelector('.tlog')

describe('Terminal app', () => {
  it('runs help and prints the shared command list', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'help')

    expect(log(win).textContent).toContain('Available commands:')
    expect(log(win).textContent).toContain("Use ↑ for history, tab to autocomplete, 'clear' to reset.")
    expect(log(win).querySelector('.pg').textContent).toBe('visitor@rafey')
  })

  it('lists home with folders in blue and links in cyan', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'ls')

    const pre = log(win).querySelector('pre')
    expect(pre.textContent).toContain('Desktop')
    expect(pre.textContent).toContain('bio.txt')
    expect([...pre.querySelectorAll('.pb')].map((node) => node.textContent)).toContain('projects')
  })

  it('offers help as a ghost and runs it on Enter at an empty prompt', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)
    expect(win.querySelector('.ghost').textContent).toBe('help')

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(log(win).textContent).toContain('Available commands:')
    expect(win.querySelector('.ghost')).toBeNull()
  })

  it('runs the ghost when tapped', () => {
    const { container } = renderDesktop()
    const { win } = openTerminal(container)

    fireEvent.click(win.querySelector('.ghost'))

    expect(log(win).textContent).toContain('Available commands:')
  })

  it('changes directory and shows it in the title and prompt', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'cd projects')

    expect(win.getAttribute('aria-label')).toBe('visitor@rafey: ~/projects')
    expect(win.querySelector('.tline .pb').textContent).toBe('~/projects')
  })

  it('completes with Tab and walks history with the arrows', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)
    typeCommand(input, 'whoami')

    fireEvent.change(input, { target: { value: 'pw' } })
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(input.value).toBe('pwd ')

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('whoami')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.value).toBe('')
  })

  it('lists several completions on the second Tab', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)
    typeCommand(input, 'clear')

    fireEvent.change(input, { target: { value: 'c' } })
    fireEvent.keyDown(input, { key: 'Tab' })
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(log(win).textContent).toContain('contact  cd  cat  clear')
  })

  it('clears with clear and with Ctrl+L', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)
    typeCommand(input, 'whoami')

    typeCommand(input, 'clear')
    expect(log(win).children).toHaveLength(0)

    typeCommand(input, 'whoami')
    fireEvent.keyDown(input, { key: 'l', ctrlKey: true })
    expect(log(win).children).toHaveLength(0)
  })

  it('opens folders in Files and the 3D view in Projects', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'xdg-open projects')
    expect(windowsOf(container, 'files')).toHaveLength(1)

    typeCommand(input, 'projects --3d')
    expect(windowsOf(container, 'projects')).toHaveLength(1)
    expect(log(win).querySelectorAll('.dm')).toHaveLength(0)
  })

  it('still opens project files in the Text Editor', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)

    typeCommand(input, 'xdg-open projects/leaf-line.txt')

    expect(windowsOf(container, 'editor')).toHaveLength(1)
    expect(windowsOf(container, 'projects')).toHaveLength(0)
  })

  it('plays music without opening a window', async () => {
    const { container, services } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'music play')
    await settle()

    expect(log(win).textContent).toContain('▶ playing   Storms Ahead · Ramé Sivano')
    expect(services.createAudio.last().play).toHaveBeenCalledTimes(1)
    expect(windowsOf(container, 'music')).toHaveLength(0)
    expect(screen.getByRole('status').textContent).toBe('Storms AheadRamé Sivano')
  })

  it('opens text files in the Text Editor and email in Mail', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)

    typeCommand(input, 'xdg-open bio.txt')
    typeCommand(input, 'open email')

    expect(windowsOf(container, 'editor')[0].getAttribute('aria-label')).toBe('bio.txt')
    expect(windowsOf(container, 'mail')).toHaveLength(1)
  })

  it('asks before opening LinkedIn, and opens the journey through the browser service', () => {
    const { container, services } = renderDesktop()
    const { input } = openTerminal(container)

    typeCommand(input, 'open linkedin')
    expect(screen.getByRole('dialog', { name: 'Open Link' })).toBeTruthy()

    typeCommand(input, 'music journey')
    expect(services.openExternal).toHaveBeenCalledTimes(1)
    expect(services.openExternal).toHaveBeenCalledWith('/journey')
  })

  it('opens another terminal in the same folder from the header', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)
    typeCommand(input, 'cd blog')

    fireEvent.click(within(win).getByRole('button', { name: 'New Window' }))

    const terminals = windowsOf(container, 'terminal')
    expect(terminals).toHaveLength(2)
    expect(terminals[1].getAttribute('aria-label')).toBe('visitor@rafey: ~/blog')
  })

  it('closes its window on exit', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)

    typeCommand(input, 'exit')

    expect(windowsOf(container, 'terminal')).toHaveLength(0)
  })

  it('logs out to the home terminal on logout', async () => {
    const { container, services } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'logout')

    expect(log(win).textContent).toContain('Returning to the rafey.ai terminal…')
    await waitFor(() => expect(services.navigate).toHaveBeenCalledWith('/'))
  })
})
