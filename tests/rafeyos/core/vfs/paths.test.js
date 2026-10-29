import { describe, it, expect } from 'vitest'
import { parentOf, joinPath, normalize, realPath, resolve, resolvePath, tilde, absPath } from '@/components/rafeyos/core/vfs/paths'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { mergeState, parseState, seedState } from '@/components/rafeyos/core/vfs/fsState'
import { fixtureContent, visitorVfs } from '@/tests/rafeyos/helpers/testVfs'

const vfs = visitorVfs(fixtureContent)

const link = (target) => ({ type: 'symlink', target, mtime: 1 })

/** The fixture tree plus these visitor nodes (path relative to the visitor's home -> node). */
const vfsWith = (nodes) => {
  const absolute = Object.fromEntries(Object.entries(nodes).map(([path, node]) => [`/home/visitor/${path}`, node]))
  return mergeState(buildVfs(fixtureContent), parseState({ v: 2, nodes: { ...seedState(1).nodes, ...absolute }, trash: {} }))
}

const linked = vfsWith({
  real: { type: 'dir', mtime: 1 },
  'real/a.txt': { type: 'text', text: 'a', mtime: 1 },
  d: link('real'),
  chain1: link('chain2'),
  chain2: link('./d/'),
  up: link('../rafey'),
  abs: link('/etc/passwd'),
  'real/back': link('../abs'),
  gone: link('nowhere'),
})

describe('parentOf', () => {
  it('returns the parent, or null for roots', () => {
    expect(parentOf('/home/rafey/Music/story.txt')).toBe('/home/rafey/Music')
    expect(parentOf('/home')).toBe('/')
    expect(parentOf('/')).toBeNull()
    expect(parentOf('trash')).toBeNull()
    expect(parentOf('trash/x')).toBe('trash')
  })
})

describe('joinPath', () => {
  it('joins a name onto a folder, including the root', () => {
    expect(joinPath('/', 'etc')).toBe('/etc')
    expect(joinPath('/home/visitor', 'Desktop')).toBe('/home/visitor/Desktop')
    expect(joinPath('trash', 'x')).toBe('trash/x')
  })
})

describe('realPath', () => {
  it('leaves paths alone, including missing ones', () => {
    expect(realPath(vfs, '/home/rafey/bio.txt')).toBe('/home/rafey/bio.txt')
    expect(realPath(vfs, '/home/rafey/missing')).toBe('/home/rafey/missing')
    expect(realPath(vfs, 'trash')).toBe('trash')
  })

  it('follows every link, and falls back to the path itself when one dangles', () => {
    expect(realPath(linked, '/home/visitor/chain1')).toBe('/home/visitor/real')
    expect(realPath(linked, '/home/visitor/d/a.txt')).toBe('/home/visitor/real/a.txt')
    expect(realPath(linked, '/home/visitor/gone')).toBe('/home/visitor/gone')
  })
})

describe('resolve', () => {
  const at = (path) => ({ ok: true, path })
  const fails = (errno) => ({ ok: false, errno })

  it('resolves links mid path relative and chained', () => {
    expect(resolve(linked, '/home/visitor/d/a.txt')).toEqual(at('/home/visitor/real/a.txt'))
    expect(resolve(linked, '/home/visitor/chain1/a.txt')).toEqual(at('/home/visitor/real/a.txt'))
    expect(resolve(linked, '/home/visitor/up/bio.txt')).toEqual(at('/home/rafey/bio.txt'))
    expect(resolve(linked, '/home/visitor/up/../visitor/d/a.txt')).toEqual(at('/home/visitor/real/a.txt'))
    expect(resolve(linked, '/home/visitor/real/back', { followLast: true })).toEqual(at('/etc/passwd'))
    expect(resolve(linked, '/')).toEqual(at('/'))
  })

  it('follows the last segment only when asked', () => {
    expect(resolve(linked, '/home/visitor/d')).toEqual(at('/home/visitor/d'))
    expect(resolve(linked, '/home/visitor/d', { followLast: true })).toEqual(at('/home/visitor/real'))
    expect(resolve(linked, '/home/visitor/gone')).toEqual(at('/home/visitor/gone'))
    expect(resolve(linked, '/home/visitor/gone', { followLast: true })).toEqual(fails('ENOENT'))
  })

  it('reports missing paths and files used as folders', () => {
    expect(resolve(linked, '/home/visitor/nope')).toEqual(fails('ENOENT'))
    expect(resolve(linked, '/home/visitor/nope/a.txt')).toEqual(fails('ENOENT'))
    expect(resolve(linked, '/home/rafey/bio.txt/x')).toEqual(fails('ENOTDIR'))
    expect(resolve(linked, '/home/visitor/abs/x')).toEqual(fails('ENOTDIR'))
  })

  it('reports eloop after 40 hops', () => {
    const hops = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`l${i + 1}`, link(i < 39 ? `l${i + 2}` : 'Desktop')]))
    const chained = vfsWith({ ...hops, l0: link('l1'), x: link('y'), y: link('x') })
    expect(resolve(chained, '/home/visitor/l1', { followLast: true })).toEqual(at('/home/visitor/Desktop'))
    expect(resolve(chained, '/home/visitor/l0', { followLast: true })).toEqual(fails('ELOOP'))
    expect(resolve(chained, '/home/visitor/x', { followLast: true })).toEqual(fails('ELOOP'))
    expect(resolve(chained, '/home/visitor/x/a.txt')).toEqual(fails('ELOOP'))
    expect(resolve(chained, '/home/visitor/x')).toEqual(at('/home/visitor/x'))
  })

  it('takes a trash path as it is', () => {
    expect(resolve(vfs, 'trash', { followLast: true })).toEqual(at('trash'))
    expect(resolve(vfs, 'trash/nope')).toEqual(fails('ENOENT'))
  })
})

describe('normalize', () => {
  it.each([
    ['new/dir', '/home/visitor', '/home/visitor/new/dir'],
    ['../x', '/home/rafey', '/home/x'],
    ['/a//b/./c/..', '/home/rafey', '/a/b'],
    ['../../../..', '/home/rafey', '/'],
    ['/', '/tmp', '/'],
    ['.', '/tmp', '/tmp'],
    // ~ is the shell's to expand, so by here it is an ordinary name
    ['~/x', '/tmp', '/tmp/~/x'],
    ['..', 'trash/x', 'trash'],
  ])('normalize builds paths that do not exist: %j from %s is %s', (arg, cwd, expected) => {
    expect(normalize(arg, cwd)).toBe(expected)
  })
})

describe('resolvePath', () => {
  it.each([
    ['', '/home/rafey', '/home/visitor'],
    ['~', '/home/rafey/Music', '/home/visitor'],
    ['~/Desktop', '/home/rafey', '/home/visitor/Desktop'],
    ['/etc/hostname', '/home/rafey', '/etc/hostname'],
    ['/home/rafey/Music', '/home/visitor', '/home/rafey/Music'],
    ['../visitor', '/home/rafey', '/home/visitor'],
    ['../../../..', '/home/rafey', '/'],
    ['/', '/home/rafey', '/'],
    ['.', '/home/rafey/Music', '/home/rafey/Music'],
    ['..', '/home/rafey/Music', '/home/rafey'],
    ['../../../../home/rafey/blog', '/home/rafey/Music', '/home/rafey/blog'],
    ['.', 'trash', 'trash'],
    ['/home/rafey', 'trash', '/home/rafey'],
    ['..', 'trash', 'trash'],
    ['../..', 'trash', 'trash'],
    ['..', 'trash/x', 'trash'],
  ])('resolves %j from %s to %s', (arg, cwd, expected) => {
    expect(resolvePath(vfs, arg, cwd)).toBe(expected)
  })

  it.each([
    ['Music/', '/home/rafey', '/home/rafey/Music'],
    ['Music//story.txt', '/home/rafey', '/home/rafey/Music/story.txt'],
    ['story.txt', '/home/rafey/Music', '/home/rafey/Music/story.txt'],
    ['./../bio.txt', '/home/rafey/Music', '/home/rafey/bio.txt'],
    ['Desktop', '/home/visitor', '/home/visitor/Desktop'],
  ])('resolves relative %j from %s to %s', (arg, cwd, expected) => {
    expect(resolvePath(vfs, arg, cwd)).toBe(expected)
  })

  it.each([
    ['/nope', '/home/rafey'],
    ['/home/visitorx', '/home/rafey'],
    ['../../../blog', '/home/rafey/Music'],
    ['nope', '/home/rafey'],
    ['Music/nope.txt', '/home/rafey'],
    ['~nope', '/home/rafey'],
  ])('returns null for %j', (arg, cwd) => {
    expect(resolvePath(vfs, arg, cwd)).toBeNull()
  })
})

describe('tilde and absPath', () => {
  it('folds the visitor home into ~ and leaves every other path alone', () => {
    expect(tilde('/home/visitor')).toBe('~')
    expect(tilde('/home/visitor/Desktop')).toBe('~/Desktop')
    expect(tilde('/home/visitorx')).toBe('/home/visitorx')
    expect(tilde('/home/rafey')).toBe('/home/rafey')
    expect(tilde('/')).toBe('/')
  })

  it('shows trash as a URI and every other path as given', () => {
    expect(absPath('trash')).toBe('trash:///')
    expect(absPath('/home/rafey/Music')).toBe('/home/rafey/Music')
  })
})
