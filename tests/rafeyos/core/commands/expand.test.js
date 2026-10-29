import { describe, it, expect } from 'vitest'
import { tokenize } from '@/components/rafeyos/core/commands/tokenize'
import { buildSyntax } from '@/components/rafeyos/core/commands/syntax'
import { expandWord, shellCollate } from '@/components/rafeyos/core/commands/expand'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { mergeState, parseState, seedState } from '@/components/rafeyos/core/vfs/fsState'
import { realContent } from '@/tests/rafeyos/helpers/testVfs'

/** The real shipped tree plus these visitor nodes (path relative to the visitor's home -> node). */
const vfsWith = (nodes) => {
  const absolute = Object.fromEntries(Object.entries(nodes).map(([path, node]) => [`/home/visitor/${path}`, node]))
  return mergeState(buildVfs(realContent), parseState({ v: 2, nodes: { ...seedState(1).nodes, ...absolute }, trash: {} }))
}

const file = (text = '') => ({ type: 'text', text, mtime: 1 })
const vfs = vfsWith({
  '.profile': file(),
  '.config': { type: 'dir', mtime: 1 },
  'a.txt': file(),
  'B.txt': file(),
  'c.md': file(),
  'my notes.txt': file(),
  'Documents/x.txt': file(),
  docs: { type: 'symlink', target: 'Documents', mtime: 1 },
  'star*.txt': file(),
})

const env = Object.freeze({ HOME: '/home/visitor', USER: 'visitor', PWD: '/home/rafey', SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin', OLDPWD: '/home/visitor' })

/** Every word of the line's first command, expanded as the shell would just before running it. */
const words = (raw, { cwd = '/home/rafey', lastCode = 0 } = {}) => {
  const tokens = tokenize(raw)
  if (!tokens.ok) throw new Error(tokens.message)
  const syntax = buildSyntax(tokens.tokens)
  if (!syntax.ok) throw new Error(syntax.message)
  return syntax.list[0].pipeline[0].words.flatMap((word) => expandWord(word, { env, cwd, vfs, lastCode }))
}

describe('expandWord quoting', () => {
  it('keeps a double space inside double quotes', () => {
    expect(words('echo "a  b"')).toEqual(['echo', 'a  b'])
  })

  it('leaves single-quoted variables literal', () => {
    expect(words("echo '$HOME'")).toEqual(['echo', '$HOME'])
  })

  it('joins an escaped blank into one word', () => {
    expect(words('echo a\\ b')).toEqual(['echo', 'a b'])
  })

  it('keeps the backslash of an unknown escape inside double quotes', () => {
    expect(words('echo "a\\nb"')).toEqual(['echo', 'a\\nb'])
    expect(words('echo -e "a\\nb"')).toEqual(['echo', '-e', 'a\\nb'])
  })

  it('drops the comment', () => {
    expect(words('echo hi # x')).toEqual(['echo', 'hi'])
  })

  it('keeps empty quotes as an empty argument', () => {
    expect(words(`echo a "" '' b`)).toEqual(['echo', 'a', '', '', 'b'])
  })
})

describe('expandWord variables', () => {
  it('drops an unquoted word that expands to nothing', () => {
    expect(words('echo a $NOPE b')).toEqual(['echo', 'a', 'b'])
    expect(words('echo "$NOPE" x$NOPE')).toEqual(['echo', '', 'x'])
  })

  it('expands variables unquoted and inside double quotes', () => {
    expect(words('echo $HOME "$USER is in $PWD"')).toEqual(['echo', '/home/visitor', 'visitor is in /home/rafey'])
  })

  it('expands braced and status vars', () => {
    expect(words('echo ${HOME}x "${USER}@" $? "${?}"', { lastCode: 127 })).toEqual(['echo', '/home/visitorx', 'visitor@', '127', '127'])
  })

  it('stops a name at the first character a name cannot hold', () => {
    expect(words('echo $USER.txt $USER_x "$PATH:"')).toEqual(['echo', 'visitor.txt', '/usr/local/bin:/usr/bin:/bin:'])
  })

  it('leaves a $ that starts no variable as it is', () => {
    expect(words('echo $ a$ "$" ${ \\$HOME "\\$HOME"')).toEqual(['echo', '$', 'a$', '$', '${', '$HOME', '$HOME'])
  })

  it('never splits or globs what a variable holds', () => {
    const spaced = { ...env, PWD: '/home/visitor/my notes.txt', OLDPWD: '*' }
    const expand = (raw) => tokenize(raw).tokens.flatMap((token) => expandWord(token, { env: spaced, cwd: '/home/visitor', vfs, lastCode: 0 }))
    expect(expand('$PWD $OLDPWD')).toEqual(['/home/visitor/my notes.txt', '*'])
  })
})

describe('expandWord tilde', () => {
  it('expands ~ and ~/ at the start of an unquoted word only', () => {
    expect(words('ls ~ ~/Desktop a~ "~" \\~ ~rafey ~"/x"')).toEqual(['ls', '/home/visitor', '/home/visitor/Desktop', 'a~', '~', '~', '~rafey', '~/x'])
  })
})

describe('expandWord globs', () => {
  it('glob matches relative and absolute in shell order', () => {
    expect(words('ls *.txt')).toEqual(['ls', 'bio.txt', 'README.txt', 'skills.txt'])
    expect(words('ls /home/rafey/*.txt')).toEqual(['ls', '/home/rafey/bio.txt', '/home/rafey/README.txt', '/home/rafey/skills.txt'])
    expect(words('ls ../rafey/*.txt', { cwd: '/home/visitor' })).toEqual(['ls', '../rafey/bio.txt', '../rafey/README.txt', '../rafey/skills.txt'])
  })

  it('matches one character per ?', () => {
    expect(words('ls ???.txt')).toEqual(['ls', 'bio.txt'])
  })

  it('leaves brackets and braces literal', () => {
    expect(words('ls [bs]*.txt {bio,skills}.txt')).toEqual(['ls', '[bs]*.txt', '{bio,skills}.txt'])
  })

  it('passes a pattern that matches nothing through as typed', () => {
    expect(words('ls *.zzz nope/*')).toEqual(['ls', '*.zzz', 'nope/*'])
  })

  it('skips dotfiles unless the pattern starts with a dot', () => {
    expect(words('echo *', { cwd: '/home/visitor' })).toEqual(['echo', 'a.txt', 'B.txt', 'c.md', 'Desktop', 'docs', 'Documents', 'Downloads', 'my notes.txt', 'star*.txt'])
    expect(words('echo .*', { cwd: '/home/visitor' })).toEqual(['echo', '.config', '.profile'])
  })

  it('keeps a name with a blank as one word', () => {
    expect(words('ls my*', { cwd: '/home/visitor' })).toEqual(['ls', 'my notes.txt'])
  })

  it('matches only folders before a slash, keeping the slash', () => {
    expect(words('ls */')).toEqual(['ls', 'blog/', 'contact/', 'Music/', 'projects/'])
    expect(words('ls /home/*/Desktop')).toEqual(['ls', '/home/visitor/Desktop'])
  })

  it('globs through a linked folder and from ~', () => {
    expect(words('ls docs/*.txt ~/Doc*/*', { cwd: '/home/visitor' })).toEqual(['ls', 'docs/x.txt', '/home/visitor/Documents/x.txt'])
    expect(words('ls /bin/whoam?')).toEqual(['ls', '/bin/whoami'])
  })

  it('never globs quoted or escaped wildcards', () => {
    expect(words(`ls "*.txt" '*' \\*.txt`)).toEqual(['ls', '*.txt', '*', '*.txt'])
    expect(words('ls star\\**', { cwd: '/home/visitor' })).toEqual(['ls', 'star*.txt'])
    expect(words('ls "star*".t?t', { cwd: '/home/visitor' })).toEqual(['ls', 'star*.txt'])
  })

  it('is case-sensitive', () => {
    expect(words('ls b*', { cwd: '/home/visitor' })).toEqual(['ls', 'b*'])
    expect(words('ls B*', { cwd: '/home/visitor' })).toEqual(['ls', 'B.txt'])
  })
})

describe('shellCollate', () => {
  it('orders names ignoring case, with no folders first', () => {
    expect(['skills.txt', 'Music', 'bio.txt', 'README.txt', 'blog'].sort(shellCollate)).toEqual(['bio.txt', 'blog', 'Music', 'README.txt', 'skills.txt'])
  })
})
