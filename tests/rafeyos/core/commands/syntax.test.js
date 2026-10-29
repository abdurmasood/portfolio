import { describe, it, expect } from 'vitest'
import { tokenize } from '@/components/rafeyos/core/commands/tokenize'
import { buildSyntax } from '@/components/rafeyos/core/commands/syntax'

const syntaxOf = (raw) => {
  const tokens = tokenize(raw)
  if (!tokens.ok) throw new Error(tokens.message)
  return buildSyntax(tokens.tokens)
}

const text = (word) => word.parts.map((part) => part.text).join('')

/** The list with each word flattened to its text: [[pipeline commands as { words, redirects }], next]. */
const outline = (raw) => {
  const result = syntaxOf(raw)
  if (!result.ok) throw new Error(result.message)
  return result.list.map(({ pipeline, next }) => [
    pipeline.map(({ words, redirects }) => ({ words: words.map(text), redirects: redirects.map(({ op, target }) => [op, text(target)]) })),
    next,
  ])
}

const command = (words, redirects = []) => ({ words, redirects })

describe('buildSyntax lists and pipelines', () => {
  it('builds nothing from no tokens', () => {
    expect(syntaxOf('   ')).toEqual({ ok: true, list: [] })
    expect(syntaxOf('# only a comment')).toEqual({ ok: true, list: [] })
  })

  it('keeps the parts of each word for expansion', () => {
    const result = syntaxOf(`echo "a b"`)
    expect(result.ok && result.list[0].pipeline[0].words[1]).toEqual({ type: 'word', parts: [{ text: 'a b', quoted: 'double' }] })
  })

  it('splits a line into pipelines joined by && || and ;', () => {
    expect(outline('a x && b || c ; d')).toEqual([
      [[command(['a', 'x'])], '&&'],
      [[command(['b'])], '||'],
      [[command(['c'])], ';'],
      [[command(['d'])], null],
    ])
  })

  it('splits a pipeline into its commands', () => {
    expect(outline('cat bio.txt | grep a | wc -l')).toEqual([
      [[command(['cat', 'bio.txt']), command(['grep', 'a']), command(['wc', '-l'])], null],
    ])
  })

  it('drops a trailing ; so only the last pipeline has no next', () => {
    expect(outline('echo hi;')).toEqual([[[command(['echo', 'hi'])], null]])
  })
})

describe('buildSyntax redirects', () => {
  it('collects redirects wherever they sit among the words', () => {
    expect(outline('echo a > f b >> g')).toEqual([[[command(['echo', 'a', 'b'], [['>', 'f'], ['>>', 'g']])], null]])
  })

  it('takes a bare > f as a command with no words', () => {
    expect(outline('> f')).toEqual([[[command([], [['>', 'f']])], null]])
  })

  it('takes 1> and 1>> as > and >>', () => {
    expect(outline('echo hi 1>f 1>>g')).toEqual([[[command(['echo', 'hi'], [['>', 'f'], ['>>', 'g']])], null]])
  })

  it('redirects one stage of a pipeline', () => {
    expect(outline('a > f | b')).toEqual([[[command(['a'], [['>', 'f']]), command(['b'])], null]])
  })
})

describe('buildSyntax errors', () => {
  it('reports the first token bash would choke on', () => {
    const cases = {
      '| a': `bash: syntax error near unexpected token '|'`,
      'a | | b': `bash: syntax error near unexpected token '|'`,
      '&& a': `bash: syntax error near unexpected token '&&'`,
      'a || ; b': `bash: syntax error near unexpected token ';'`,
      ';': `bash: syntax error near unexpected token ';'`,
      'a ;; b': `bash: syntax error near unexpected token ';;'`,
      'echo a;;': `bash: syntax error near unexpected token ';;'`,
      ';;': `bash: syntax error near unexpected token ';;'`,
      'echo a ; ; b': `bash: syntax error near unexpected token ';'`,
      'echo >': `bash: syntax error near unexpected token 'newline'`,
      'echo > > f': `bash: syntax error near unexpected token '>'`,
      'echo >> | f': `bash: syntax error near unexpected token '|'`,
      'a |': 'bash: syntax error: unexpected end of file',
      'a &&': 'bash: syntax error: unexpected end of file',
      'a ||': 'bash: syntax error: unexpected end of file',
    }
    Object.entries(cases).forEach(([raw, message]) => expect(syntaxOf(raw), raw).toEqual({ ok: false, message, code: 2 }))
  })

  it('rejects each tier3 form with its category', () => {
    const cases = {
      'for f in *.txt; do cat "$f"; done': 'bash: for: loops isn\'t supported here',
      'while true; do :; done': 'bash: while: loops isn\'t supported here',
      'until false': 'bash: until: loops isn\'t supported here',
      'select x in a b': 'bash: select: loops isn\'t supported here',
      'if true; then ls; fi': 'bash: if: conditionals isn\'t supported here',
      'case x in': 'bash: case: conditionals isn\'t supported here',
      'function f': 'bash: function: functions isn\'t supported here',
      '(ls)': 'bash: (: subshells isn\'t supported here',
      'ls )': 'bash: ): subshells isn\'t supported here',
      'echo $(whoami)': 'bash: $(…): command substitution isn\'t supported here',
      'echo "today is `date`"': 'bash: `…`: command substitution isn\'t supported here',
      'FOO=bar': 'bash: FOO=bar: variables isn\'t supported here',
      'FOO="a b" ls': 'bash: FOO=a b: variables isn\'t supported here',
      'export FOO': 'bash: export: variables isn\'t supported here',
      'sleep 5 &': 'bash: &: background jobs isn\'t supported here',
      'cat < bio.txt': 'bash: <: input redirection isn\'t supported here',
      'ls nope 2> err.txt': 'bash: 2>: file descriptor redirection isn\'t supported here',
      'echo hi >&2': 'bash: >&: file descriptor redirection isn\'t supported here',
      'ls nope 2>&1': 'bash: 2>&: file descriptor redirection isn\'t supported here',
      'ls &> f': 'bash: &>: file descriptor redirection isn\'t supported here',
      'ls &>> f': 'bash: &>>: file descriptor redirection isn\'t supported here',
      'foo() { echo hi; }': 'bash: (: functions isn\'t supported here',
      'foo () { echo hi; }': 'bash: (: functions isn\'t supported here',
      'echo hi |& cat': 'bash: |&: file descriptor redirection isn\'t supported here',
    }
    Object.entries(cases).forEach(([raw, message]) => expect(syntaxOf(raw), raw).toEqual({ ok: false, message, code: 2 }))
  })

  it('reports a ( after a lone name that no ) closes at once as out of place, naming what follows it', () => {
    const cases = {
      'foo (b)': 'b',
      'foo (': 'newline',
      'foo ( ;': ';',
      'foo ( |': '|',
      'foo ( >f': '>',
      'foo ( &': '&',
      'foo ( (': '(',
      'foo ( $(x)': '$(…)',
    }
    Object.entries(cases).forEach(([raw, token]) =>
      expect(syntaxOf(raw), raw).toEqual({ ok: false, message: `bash: syntax error near unexpected token '${token}'`, code: 2 }),
    )
  })

  it('reports a ( after more than a function name as out of place', () => {
    const cases = ['echo a (b)', '> f foo ()', '> f (ls)']
    cases.forEach((raw) => expect(syntaxOf(raw), raw).toEqual({ ok: false, message: `bash: syntax error near unexpected token '('`, code: 2 }))
  })

  it('checks the first word of every command, not just the line', () => {
    expect(syntaxOf('echo hi; for x').ok).toBe(false)
    expect(syntaxOf('ls | while read x').ok).toBe(false)
    expect(syntaxOf('> f export A').ok).toBe(false)
    expect(syntaxOf('> f A=1').ok).toBe(false)
  })

  it('leaves keywords alone when quoted or not first', () => {
    expect(outline(`'for' x; echo if export a=b`)).toEqual([
      [[command(['for', 'x'])], ';'],
      [[command(['echo', 'if', 'export', 'a=b'])], null],
    ])
    expect(outline('> f for x')).toEqual([[[command(['for', 'x'], [['>', 'f']])], null]])
    expect(outline(`"FOO"=bar; =x; 1A=b`)).toEqual([
      [[command(['FOO=bar'])], ';'],
      [[command(['=x'])], ';'],
      [[command(['1A=b'])], null],
    ])
  })
})
