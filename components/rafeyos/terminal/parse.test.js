import { describe, it, expect } from 'vitest'
import { parse } from './parse'

describe('parse', () => {
  it('splits name, args and flags on any whitespace', () => {
    const parsed = parse('  uname   -a  foo\tbar ')

    expect(parsed).toEqual({ name: 'uname', args: ['foo', 'bar'], flags: ['-a'], words: ['-a', 'foo', 'bar'] })
  })

  it('returns an empty name for blank or missing input', () => {
    expect(parse('   ')).toEqual({ name: '', args: [], flags: [], words: [] })
    expect(parse(undefined).name).toBe('')
  })
})
