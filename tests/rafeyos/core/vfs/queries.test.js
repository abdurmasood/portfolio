import { describe, it, expect } from 'vitest'
import { children, isDir, displayName, sizeOf, sizeLabel, kindOf, search, textDocuments } from '@/components/rafeyos/core/vfs/queries'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { mergeState, seedState } from '@/components/rafeyos/core/vfs/fsState'
import { fixtureContent, realVfs, visitorVfs } from '@/tests/rafeyos/helpers/testVfs'

const vfs = visitorVfs(fixtureContent)

describe('children', () => {
  it('lists folders first, then files, ignoring case', () => {
    expect(children(vfs, '/home/rafey')).toEqual([
      '/home/rafey/blog', '/home/rafey/contact', '/home/rafey/Music', '/home/rafey/projects',
      '/home/rafey/bio.txt', '/home/rafey/README.txt', '/home/rafey/skills.txt',
    ])
  })

  it('lists the root and the visitor home', () => {
    expect(children(realVfs, '/')).toEqual(['/etc', '/home', '/tmp', '/usr'])
    expect(children(vfs, '/home')).toEqual(['/home/rafey', '/home/visitor'])
    expect(children(vfs, '/home/visitor')).toEqual(['/home/visitor/Desktop', '/home/visitor/Documents', '/home/visitor/Downloads'])
  })

  it('returns an empty list for empty folders and files', () => {
    expect(children(vfs, '/home/visitor/Desktop')).toEqual([])
    expect(children(vfs, 'trash')).toEqual([])
    expect(children(vfs, '/home/rafey/bio.txt')).toEqual([])
  })
})

describe('isDir and displayName', () => {
  it('tells folders from files', () => {
    expect(isDir(vfs, '/home/rafey/projects')).toBe(true)
    expect(isDir(vfs, '/home/rafey/bio.txt')).toBe(false)
    expect(isDir(vfs, '/home/rafey/missing')).toBe(false)
  })

  it('names home "Home" and prefers display over name', () => {
    expect(displayName(vfs, '/home/visitor')).toBe('Home')
    expect(displayName(vfs, '/home/rafey/contact/email.desktop')).toBe('Email Rafey')
    expect(displayName(vfs, '/home/rafey/bio.txt')).toBe('bio.txt')
  })
})

describe('sizes', () => {
  it('counts UTF-8 bytes of text and uses sizeBytes for audio', () => {
    expect(sizeOf(vfs, '/home/rafey/bio.txt')).toBe(9)
    expect(sizeOf(vfs, '/home/rafey/Music/song.mp3')).toBe(2500000)
  })

  it('counts multi-byte characters as bytes', () => {
    const unicode = buildVfs({ ...fixtureContent, readme: '█' })

    expect(sizeOf(unicode, '/home/rafey/README.txt')).toBe(3)
  })

  it('labels folders by item count and files by human bytes', () => {
    expect(sizeLabel(vfs, '/home/rafey/blog')).toBe('1 item')
    expect(sizeLabel(vfs, '/home/rafey/Music')).toBe('2 items')
    expect(sizeLabel(vfs, 'trash')).toBe('0 items')
    expect(sizeLabel(vfs, '/home/rafey/projects')).toBe('2 items')
    expect(sizeLabel(vfs, '/home/rafey/Music/song.mp3')).toBe('2.5 MB')
  })
})

describe('kindOf', () => {
  it.each([
    ['/home/rafey/Music', 'Folder'],
    ['/home/rafey/bio.txt', 'Plain text document'],
    ['/home/rafey/blog/first-post.md', 'Markdown document'],
    ['/home/rafey/Music/song.mp3', 'MP3 audio'],
    ['/home/rafey/contact/email.desktop', 'Link to email'],
    ['/home/rafey/contact/linkedin.desktop', 'Link to website'],
  ])('%s is %s', (path, kind) => {
    expect(kindOf(vfs, path)).toBe(kind)
  })
})

describe('search', () => {
  it('matches display names case-insensitively', () => {
    expect(search(vfs, 'EMAIL')).toEqual(['/home/rafey/contact/email.desktop'])
  })

  it('excludes trash, symlinks, system files and the homes themselves', () => {
    expect(search(vfs, 'bio')).toEqual(['/home/rafey/bio.txt'])
    expect(search(vfs, 'trash')).toEqual([])
    expect(search(vfs, 'home')).toEqual([])
    expect(search(vfs, 'visitor')).toEqual([])
    expect(search(realVfs, 'pass')).toEqual([])
    expect(search(realVfs, 'hostname')).toEqual([])
    expect(search(vfs, 'project')).toEqual(['/home/rafey/projects', '/home/rafey/projects/alpha-project.txt'])
  })

  it('returns nothing for a blank query', () => {
    expect(search(vfs, '   ')).toEqual([])
  })
})

describe('textDocuments', () => {
  it('lists every text file and nothing else', () => {
    const docs = textDocuments(realVfs)

    expect(docs).toContain('/home/rafey/bio.txt')
    expect(docs).toContain('/home/rafey/Music/story.txt')
    expect(docs.every((path) => realVfs[path].type === 'text')).toBe(true)
  })

  it('skips a file sitting in Trash', () => {
    const merged = mergeState(realVfs, { ...seedState(0), trash: { '/home/visitor/Desktop/notes.txt': { node: { type: 'text', text: 'hello\n', mtime: 0 }, mtime: 0 } } })

    expect(textDocuments(merged)).not.toContain(trashItemPath('/home/visitor/Desktop/notes.txt'))
    expect(textDocuments(merged)).toContain('/home/rafey/bio.txt')
  })

  it('leaves system files out', () => {
    expect(textDocuments(realVfs).filter((path) => path.startsWith('/etc') || path.startsWith('/usr'))).toEqual([])
  })
})
