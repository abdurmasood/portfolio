// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import {
  desktopIcon,
  fsDisk,
  fsStoreOn,
  openTerminal,
  renderDesktop,
  settle,
  typeCommand,
  windowsOf,
} from '@/tests/rafeyos/helpers/renderRafeyOS'

afterEach(cleanup)

const log = (win) => win.querySelector('.tlog')

describe('Terminal app', () => {
  it('runs help and prints the shared command list', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'help')

    expect(log(win).textContent).toContain('Available commands:')
    expect(log(win).textContent).toContain("Use ↑ for history, tab to autocomplete, 'clear' to reset.")
    expect(log(win).querySelector('.pg').textContent).toBe('visitor@rafey.ai')
  })

  it('terminal prompt and title say rafey.ai', () => {
    const { container } = renderDesktop()
    const { win } = openTerminal(container)

    expect(win.querySelector('.tline .pg').textContent).toBe('visitor@rafey.ai')
    expect(win.getAttribute('aria-label')).toBe('visitor@rafey.ai: /home/rafey')
  })

  it('ctrl+c prints ^C, clears the input and sets $? to 130', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)
    fireEvent.change(input, { target: { value: 'echo oops' } })

    fireEvent.keyDown(input, { key: 'c', ctrlKey: true })

    expect(input.value).toBe('')
    // The prompt's space is a no-break one, so it survives in the DOM
    expect(log(win).lastElementChild.textContent).toBe('visitor@rafey.ai:/home/rafey$\u00a0echo oops^C')
    typeCommand(input, 'echo $?')
    expect(log(win).lastElementChild.textContent).toBe('130')
  })

  it('keeps $? from one command line to the next', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'false')
    typeCommand(input, 'echo $?')

    expect(log(win).lastElementChild.textContent).toBe('1')
  })

  it('creating a file then xdg-open on one line opens it in the editor', () => {
    const { container, services } = renderDesktop()
    const { input } = openTerminal(container)

    typeCommand(input, 'cd && echo hi > notes.txt && xdg-open notes.txt')

    expect(services.fs.getState().nodes['/home/visitor/notes.txt'].text).toBe('hi\n')
    expect(windowsOf(container, 'editor').map((editor) => editor.getAttribute('aria-label'))).toEqual(['notes.txt'])
  })

  it('a new terminal starts in rafey\'s home and New Window copies the cwd', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)
    expect(win.getAttribute('aria-label')).toBe('visitor@rafey.ai: /home/rafey')
    typeCommand(input, 'cd ~/Documents')

    fireEvent.click(within(win).getByRole('button', { name: 'New Window' }))
    fireEvent.keyDown(document.body, { key: 't', ctrlKey: true, altKey: true })

    expect(windowsOf(container, 'terminal').map((terminal) => terminal.getAttribute('aria-label'))).toEqual([
      'visitor@rafey.ai: ~/Documents',
      'visitor@rafey.ai: ~/Documents',
      'visitor@rafey.ai: /home/rafey',
    ])
  })

  it('starts in Rafey\'s home and lists it with folders in blue', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)

    typeCommand(input, 'ls')

    const pre = log(win).querySelector('pre')
    expect(pre.textContent).toContain('Music')
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

    expect(win.getAttribute('aria-label')).toBe('visitor@rafey.ai: /home/rafey/projects')
    expect(win.querySelector('.tline .pb').textContent).toBe('/home/rafey/projects')
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

  it('asks before opening LinkedIn', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)

    typeCommand(input, 'open linkedin')
    expect(screen.getByRole('dialog', { name: 'Open Link' })).toBeTruthy()
  })

  it('opens another terminal in the same folder from the header', () => {
    const { container } = renderDesktop()
    const { win, input } = openTerminal(container)
    typeCommand(input, 'cd blog')

    fireEvent.click(within(win).getByRole('button', { name: 'New Window' }))

    const terminals = windowsOf(container, 'terminal')
    expect(terminals).toHaveLength(2)
    expect(terminals[1].getAttribute('aria-label')).toBe('visitor@rafey.ai: /home/rafey/blog')
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

  it('mkdir in the terminal puts a folder on the desktop', () => {
    const { container } = renderDesktop()
    const { input } = openTerminal(container)

    typeCommand(input, 'mkdir ~/Desktop/notes')

    expect(desktopIcon(container, '/home/visitor/Desktop/notes')).not.toBeNull()
  })

  it('rm in the terminal removes the desktop icon', () => {
    const { container } = renderDesktop({ fs: fsStoreOn(fsDisk({ '/home/visitor/Desktop/a.txt': 'x' })) })
    const { input } = openTerminal(container)
    expect(desktopIcon(container, '/home/visitor/Desktop/a.txt')).not.toBeNull()

    typeCommand(input, 'rm ~/Desktop/a.txt')

    expect(desktopIcon(container, '/home/visitor/Desktop/a.txt')).toBeNull()
  })
})
