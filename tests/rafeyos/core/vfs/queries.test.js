import { describe, it, expect } from 'vitest'
import { children, isDir, displayName, sizeOf, sizeLabel, kindOf, search, textDocuments } from '@/components/rafeyos/core/vfs/queries'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { mergeDocuments, trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { fixtureContent, realVfs } from '@/tests/rafeyos/helpers/testVfs'

const vfs = buildVfs(fixtureContent)

describe('children', () => {
  it('lists folders first, then files, ignoring case', () => {
    expect(children(vfs, '~')).toEqual([
      '~/blog', '~/contact', '~/Desktop', '~/Documents', '~/Music', '~/projects', '~/bio.txt', '~/README.txt', '~/skills.txt',
    ])
  })

  it('returns an empty list for empty folders and files', () => {
    expect(children(vfs, '~/Desktop')).toEqual([])
    expect(children(vfs, 'trash')).toEqual([])
    expect(children(vfs, '~/bio.txt')).toEqual([])
  })
})

describe('isDir and displayName', () => {
  it('tells folders from files', () => {
    expect(isDir(vfs, '~/projects')).toBe(true)
    expect(isDir(vfs, '~/bio.txt')).toBe(false)
    expect(isDir(vfs, '~/missing')).toBe(false)
  })

  it('names home "Home" and prefers display over name', () => {
    expect(displayName(vfs, '~')).toBe('Home')
    expect(displayName(vfs, '~/contact/email.desktop')).toBe('Email Rafey')
    expect(displayName(vfs, '~/bio.txt')).toBe('bio.txt')
  })
})

describe('sizes', () => {
  it('counts UTF-8 bytes of text and uses sizeBytes for audio', () => {
    expect(sizeOf(vfs, '~/bio.txt')).toBe(9)
    expect(sizeOf(vfs, '~/Music/song.mp3')).toBe(2500000)
  })

  it('counts multi-byte characters as bytes', () => {
    const unicode = buildVfs({ ...fixtureContent, readme: '█' })

    expect(sizeOf(unicode, '~/README.txt')).toBe(3)
  })

  it('labels folders by item count and files by human bytes', () => {
    expect(sizeLabel(vfs, '~/blog')).toBe('1 item')
    expect(sizeLabel(vfs, '~/Music')).toBe('2 items')
    expect(sizeLabel(vfs, 'trash')).toBe('0 items')
    expect(sizeLabel(vfs, '~/projects')).toBe('2 items')
    expect(sizeLabel(vfs, '~/Music/song.mp3')).toBe('2.5 MB')
  })
})

describe('kindOf', () => {
  it.each([
    ['~/Music', 'Folder'],
    ['~/bio.txt', 'Plain text document'],
    ['~/blog/first-post.md', 'Markdown document'],
    ['~/Music/song.mp3', 'MP3 audio'],
    ['~/contact/email.desktop', 'Link to email'],
    ['~/contact/linkedin.desktop', 'Link to website'],
  ])('%s is %s', (path, kind) => {
    expect(kindOf(vfs, path)).toBe(kind)
  })
})

describe('search', () => {
  it('matches display names case-insensitively', () => {
    expect(search(vfs, 'EMAIL')).toEqual(['~/contact/email.desktop'])
  })

  it('excludes trash, symlinks and home', () => {
    expect(search(vfs, 'bio')).toEqual(['~/bio.txt'])
    expect(search(vfs, 'trash')).toEqual([])
    expect(search(vfs, 'home')).toEqual([])
    expect(search(vfs, 'project')).toEqual(['~/projects', '~/projects/alpha-project.txt'])
  })

  it('returns nothing for a blank query', () => {
    expect(search(vfs, '   ')).toEqual([])
  })
})

describe('textDocuments', () => {
  it('lists every text file and nothing else', () => {
    const docs = textDocuments(realVfs)

    expect(docs).toContain('~/bio.txt')
    expect(docs).toContain('~/Music/story.txt')
    expect(docs.every((path) => realVfs[path].type === 'text')).toBe(true)
  })

  it('skips a file sitting in Trash', () => {
    const merged = mergeDocuments(realVfs, {}, { '~/Desktop/notes.txt': 'hello\n' })

    expect(textDocuments(merged)).not.toContain(trashItemPath('~/Desktop/notes.txt'))
    expect(textDocuments(merged)).toContain('~/bio.txt')
  })
})
