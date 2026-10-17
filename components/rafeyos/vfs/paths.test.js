import { describe, it, expect } from 'vitest'
import { parentOf, realPath, resolvePath, tilde, absPath } from './paths'
import { buildVfs } from './buildVfs'
import { fixtureContent } from './testVfs'

const vfs = buildVfs(fixtureContent)

describe('parentOf', () => {
  it('returns the parent, or null for roots', () => {
    expect(parentOf('~/Music/story.txt')).toBe('~/Music')
    expect(parentOf('~')).toBeNull()
    expect(parentOf('trash')).toBeNull()
  })
})

describe('realPath', () => {
  it('follows symlinks and leaves other paths alone', () => {
    expect(realPath(vfs, '~/Desktop/projects')).toBe('~/projects')
    expect(realPath(vfs, '~/bio.txt')).toBe('~/bio.txt')
    expect(realPath(vfs, '~/missing')).toBe('~/missing')
  })
})

describe('resolvePath', () => {
  it.each([
    ['', '~/Music', '~'],
    ['~', '~/Music', '~'],
    ['~/Music', '~/blog', '~/Music'],
    ['/home/visitor/Music', '~', '~/Music'],
    ['/home/visitor', '~/Music', '~'],
    ['.', '~/Music', '~/Music'],
    ['..', '~/Music', '~'],
    ['../..', '~/Music', '~'],
    ['../../../blog', '~/Music', '~/blog'],
    ['Music/', '~', '~/Music'],
    ['Music//story.txt', '~', '~/Music/story.txt'],
    ['story.txt', '~/Music', '~/Music/story.txt'],
    ['./../bio.txt', '~/Music', '~/bio.txt'],
    ['Desktop/projects', '~', '~/Desktop/projects'],
  ])('resolves %j from %s to %s', (arg, cwd, expected) => {
    expect(resolvePath(vfs, arg, cwd)).toBe(expected)
  })

  it.each([
    ['/etc/passwd', '~'],
    ['/home/visitorx', '~'],
    ['nope', '~'],
    ['Music/nope.txt', '~'],
    ['~nope', '~'],
  ])('returns null for %j', (arg, cwd) => {
    expect(resolvePath(vfs, arg, cwd)).toBeNull()
  })

  it('does not follow symlinks itself', () => {
    expect(resolvePath(vfs, 'Desktop/bio.txt', '~')).toBe('~/Desktop/bio.txt')
  })
})

describe('tilde and absPath', () => {
  it('shows internal paths as-is and folds /home/visitor into ~', () => {
    expect(tilde('~/Music')).toBe('~/Music')
    expect(tilde('/home/visitor/blog')).toBe('~/blog')
  })

  it('maps to absolute paths, with trash as a URI', () => {
    expect(absPath('~')).toBe('/home/visitor')
    expect(absPath('~/Music')).toBe('/home/visitor/Music')
    expect(absPath('trash')).toBe('trash:///')
  })
})
