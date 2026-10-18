import { describe, it, expect } from 'vitest'
import { pre, error, dim, link, ls, prompt } from '@/components/rafeyos/terminal/lines'

describe('line constructors', () => {
  it('build plain typed objects', () => {
    expect(pre('a')).toEqual({ type: 'pre', text: 'a' })
    expect(error('b')).toEqual({ type: 'error', text: 'b' })
    expect(dim('c')).toEqual({ type: 'dim', text: 'c' })
    expect(link('d', '/d')).toEqual({ type: 'link', text: 'd', href: '/d' })
    expect(prompt('~/Music', 'ls')).toEqual({ type: 'prompt', cwd: '~/Music', cmd: 'ls' })
  })

  it('copies ls entries so callers cannot alias them', () => {
    const entries = [{ name: 'blog', kind: 'dir' }]

    const line = ls(entries)

    expect(line).toEqual({ type: 'ls', entries: [{ name: 'blog', kind: 'dir' }] })
    expect(line.entries[0]).not.toBe(entries[0])
  })
})
