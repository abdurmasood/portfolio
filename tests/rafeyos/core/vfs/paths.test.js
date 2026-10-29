import { describe, it, expect } from 'vitest'
import { parentOf, joinPath, realPath, resolvePath, tilde, absPath } from '@/components/rafeyos/core/vfs/paths'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

const vfs = buildVfs(fixtureContent)

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
