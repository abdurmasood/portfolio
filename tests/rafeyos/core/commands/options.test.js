import { describe, it, expect } from 'vitest'
import { parseOptions } from '@/components/rafeyos/core/commands/options'

const LS = { name: 'ls', flags: 'laAh1trSd', long: { all: 'a', 'almost-all': 'A' }, usageCode: 2 }
const HEAD = { name: 'head', flags: 'qv', values: 'nc', long: { lines: 'n', bytes: 'c', quiet: 'q' }, numeric: 'n' }

describe('parseOptions', () => {
  it('splits combined short flags and keeps operands in order', () => {
    expect(parseOptions(['-la', 'blog', '-h', 'Music'], LS)).toEqual({ flags: { l: true, a: true, h: true }, values: {}, operands: ['blog', 'Music'] })
  })

  it('treats everything after -- and a lone - as operands', () => {
    expect(parseOptions(['-l', '--', '-a', '-'], LS)).toEqual({ flags: { l: true }, values: {}, operands: ['-a', '-'] })
    expect(parseOptions(['-'], LS).operands).toEqual(['-'])
  })

  it('reads valued options spaced, glued and as a bare number', () => {
    expect(parseOptions(['-n', '5', 'a'], HEAD)).toEqual({ flags: {}, values: { n: '5' }, operands: ['a'] })
    expect(parseOptions(['-n5'], HEAD).values).toEqual({ n: '5' })
    expect(parseOptions(['-qn3'], HEAD)).toEqual({ flags: { q: true }, values: { n: '3' }, operands: [] })
    expect(parseOptions(['-5', 'a'], HEAD)).toEqual({ flags: {}, values: { n: '5' }, operands: ['a'] })
  })

  it('reads long options, with = or a following word for values', () => {
    expect(parseOptions(['--all'], LS).flags).toEqual({ a: true })
    expect(parseOptions(['--lines=4', '--quiet'], HEAD)).toEqual({ flags: { q: true }, values: { n: '4' }, operands: [] })
    expect(parseOptions(['--bytes', '9'], HEAD).values).toEqual({ c: '9' })
  })

  it('a later value wins', () => {
    expect(parseOptions(['-n', '1', '-n', '2'], HEAD).values).toEqual({ n: '2' })
  })

  it('reports an unknown short flag the GNU way, with the usage code', () => {
    expect(parseOptions(['-lz'], LS)).toEqual({
      error: ["ls: invalid option -- 'z'", "Try 'ls --help' for more information."],
      code: 2,
    })
    expect(parseOptions(['-z'], HEAD).code).toBe(1)
  })

  it('reports an unknown long option and a missing value', () => {
    expect(parseOptions(['--nope'], LS).error).toEqual(["ls: unrecognized option '--nope'", "Try 'ls --help' for more information."])
    expect(parseOptions(['-n'], HEAD).error).toEqual(["head: option requires an argument -- 'n'", "Try 'head --help' for more information."])
    expect(parseOptions(['--lines'], HEAD).error[0]).toBe("head: option '--lines' requires an argument")
    expect(parseOptions(['--all=x'], LS).error[0]).toBe("ls: option '--all' doesn't allow an argument")
  })

  it('a bare number is a flag error for a command without a numeric option', () => {
    expect(parseOptions(['-5'], LS).error[0]).toBe("ls: invalid option -- '5'")
  })
})
