import { describe, it, expect } from 'vitest'
import { tokenize } from '@/components/rafeyos/core/commands/tokenize'

const tokensOf = (raw) => {
  const result = tokenize(raw)
  if (!result.ok) throw new Error(result.message)
  return result.tokens
}

const none = (text) => ({ text, quoted: 'none' })
const single = (text) => ({ text, quoted: 'single' })
const double = (text) => ({ text, quoted: 'double' })
const word = (...parts) => ({ type: 'word', parts })
const op = (operator) => ({ type: 'op', op: operator })

/** Each word's parts joined, with operators as themselves: the shape a line splits into. */
const shape = (raw) => tokensOf(raw).map((token) => (token.type === 'word' ? token.parts.map((part) => part.text).join('') : token.op ?? token.text))

describe('tokenize words', () => {
  it('splits on any run of blanks and ignores a blank line', () => {
    expect(tokensOf('  ls \t -la   ~  ')).toEqual([word(none('ls')), word(none('-la')), word(none('~'))])
    expect(tokensOf('   ')).toEqual([])
    expect(tokensOf('')).toEqual([])
  })

  it('keeps blanks inside double quotes', () => {
    expect(tokensOf('echo "a  b"')).toEqual([word(none('echo')), word(double('a  b'))])
  })

  it('keeps everything inside single quotes literal', () => {
    expect(tokensOf("echo '$HOME \\ \"x\"'")).toEqual([word(none('echo')), word(single('$HOME \\ "x"'))])
  })

  it('joins quoted and unquoted pieces that touch into one word', () => {
    expect(tokensOf(`a"b c"'d'e`)).toEqual([word(none('a'), double('b c'), single('d'), none('e'))])
  })

  it('keeps an empty pair of quotes as an empty word', () => {
    expect(tokensOf(`echo "" ''`)).toEqual([word(none('echo')), word(double('')), word(single(''))])
  })
})

describe('tokenize backslashes', () => {
  it('makes the next character literal outside quotes', () => {
    expect(tokensOf('echo a\\ b')).toEqual([word(none('echo')), word(none('a'), single(' '), none('b'))])
    expect(shape('echo \\"x\\" \\|')).toEqual(['echo', '"x"', '|'])
  })

  it('escapes only $ ` " \\ and newline inside double quotes', () => {
    expect(tokensOf('"\\$\\`\\"\\\\"')).toEqual([word(single('$`"\\'))])
    expect(tokensOf('echo "a\\nb"')).toEqual([word(none('echo')), word(double('a\\nb'))])
  })

  it('drops a backslash before a newline and keeps a trailing one', () => {
    expect(shape('echo a\\\nb "c\\\nd"')).toEqual(['echo', 'ab', 'cd'])
    expect(shape('echo a\\')).toEqual(['echo', 'a\\'])
  })
})

describe('tokenize operators', () => {
  it('splits operators without spaces', () => {
    expect(tokensOf('a|b&&c;d>f')).toEqual([
      word(none('a')), op('|'), word(none('b')), op('&&'), word(none('c')), op(';'), word(none('d')), op('>'), word(none('f')),
    ])
    expect(shape('a||b>>c')).toEqual(['a', '||', 'b', '>>', 'c'])
  })

  it('leaves quoted and escaped operators inside words', () => {
    expect(shape(`echo '|' "&&" \\; a">"b`)).toEqual(['echo', '|', '&&', ';', 'a>b'])
  })

  it('marks syntax this shell refuses', () => {
    const firstUnsupported = (raw) => tokensOf(raw).find((token) => token.type === 'unsupported')
    const cases = {
      'a & b': '&',
      '(a)': '(',
      'a)': ')',
      'cat < f': '<',
      'cat << EOF': '<<',
      'ls 2> f': '2>',
      'ls 10>>f': '10>>',
      'ls 0< f': '0<',
      'echo $(whoami)': '$(…)',
      'echo "is $(id)"': '$(…)',
      'echo `date`': '`…`',
      'echo "`date`"': '`…`',
    }
    Object.entries(cases).forEach(([raw, text]) => expect(firstUnsupported(raw), raw).toEqual({ type: 'unsupported', text }))
  })

  it('treats digits as a word unless a redirect touches them', () => {
    expect(shape('echo 2 > f')).toEqual(['echo', '2', '>', 'f'])
    expect(shape('echo a2> f')).toEqual(['echo', 'a2', '>', 'f'])
  })

  it('keeps $( and backticks literal in single quotes or escaped', () => {
    expect(shape("echo '$(x)' \\`")).toEqual(['echo', '$(x)', '`'])
    expect(shape('echo "\\$(x)"')).toEqual(['echo', '$(x)'])
  })
})

describe('tokenize comments', () => {
  it('ends the line at an unquoted # that starts a word', () => {
    expect(shape('echo hi # x')).toEqual(['echo', 'hi'])
    expect(shape('echo hi;# x')).toEqual(['echo', 'hi', ';'])
    expect(shape('# all of it')).toEqual([])
  })

  it('comment only at word start', () => {
    expect(shape('echo a#b')).toEqual(['echo', 'a#b'])
    expect(shape(`echo '#x' "#y" \\#z`)).toEqual(['echo', '#x', '#y', '#z'])
  })
})

describe('tokenize errors', () => {
  it('reports an unterminated quote the way bash does', () => {
    expect(tokenize('echo "abc')).toEqual({ ok: false, message: `bash: unexpected EOF while looking for matching '"'` })
    expect(tokenize("echo 'abc")).toEqual({ ok: false, message: `bash: unexpected EOF while looking for matching '''` })
    expect(tokenize('echo "a\\"')).toEqual({ ok: false, message: `bash: unexpected EOF while looking for matching '"'` })
  })
})
