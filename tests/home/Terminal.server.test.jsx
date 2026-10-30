// A server render has no window: the homepage must still render, in ~
import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const { default: Terminal } = await import('@/components/home/Terminal')
const { TerminalProvider } = await import('@/components/home/TerminalProvider')

const text = (html) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')

describe('home terminal: server render', () => {
  it('server render starts in ~ without a window', () => {
    expect(globalThis.window).toBeUndefined()

    const html = renderToString(
      <TerminalProvider>
        <Terminal />
      </TerminalProvider>,
    )

    expect(text(html)).toContain('visitor@rafey.ai:~$')
  })
})
