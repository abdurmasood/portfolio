import { describe, it, expect } from 'vitest'
import { children, isDir, isHidden, displayName, sizeOf, sizeLabel, kindOf, search, statOf, textDocuments } from '@/components/rafeyos/core/vfs/queries'
import { buildVfs, SHIPPED_MTIME } from '@/components/rafeyos/core/vfs/buildVfs'
import { trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { dirNode, mergeState, seedState, symlinkNode, textNode, withNodes } from '@/components/rafeyos/core/vfs/fsState'
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
    expect(children(realVfs, '/')).toEqual(['/bin', '/etc', '/home', '/tmp', '/usr'])
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

describe('missing paths and dangling links', () => {
  const linked = mergeState(buildVfs(fixtureContent), withNodes(seedState(0), {
    ...seedState(0).nodes,
    '/home/visitor/nowhere': symlinkNode('gone.txt', 0),
    '/home/visitor/chain': symlinkNode('bio', 0),
    '/home/visitor/bio': symlinkNode('../rafey/bio.txt', 0),
  }))

  it('display name of a missing path is its last segment', () => {
    const gone = '/home/visitor/Documents/gone.txt'

    expect(displayName(vfs, gone)).toBe('gone.txt')
    expect(kindOf(vfs, gone)).toBe('Unknown')
    expect(sizeOf(vfs, gone)).toBe(0)
    expect(sizeLabel(vfs, gone)).toBe('0 bytes')
  })

  it('calls a dangling link broken, with no size', () => {
    expect(kindOf(linked, '/home/visitor/nowhere')).toBe('Link (broken)')
    expect(sizeOf(linked, '/home/visitor/nowhere')).toBe(0)
    expect(sizeLabel(linked, '/home/visitor/nowhere')).toBe('0 bytes')
  })

  it('names what a relative or chained link reaches', () => {
    expect(kindOf(linked, '/home/visitor/chain')).toBe('Link to plain text document')
    expect(sizeOf(linked, '/home/visitor/chain')).toBe(sizeOf(linked, '/home/rafey/bio.txt'))
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

const VISITOR_TIME = Date.UTC(2026, 9, 29, 14, 5)

/** The fixture tree plus a visitor file, a relative link to it, a dotfile, a hidden folder and a file in /tmp. */
const visitorTree = () => {
  const seed = seedState(0)
  return mergeState(buildVfs(fixtureContent), withNodes(seed, {
    ...seed.nodes,
    '/home/visitor/notes.txt': textNode('hi\n', VISITOR_TIME),
    '/home/visitor/link': symlinkNode('notes.txt', VISITOR_TIME),
    '/home/visitor/.profile': textNode('# bio\n', VISITOR_TIME),
    '/home/visitor/.config': dirNode(VISITOR_TIME),
    '/home/visitor/.config/bio.txt': textNode('bio\n', VISITOR_TIME),
    '/home/visitor/Desktop/.secret.txt': textNode('bio\n', VISITOR_TIME),
    '/tmp/x': textNode('', VISITOR_TIME),
  }))
}

describe('statOf', () => {
  const tree = visitorTree()
  const shipped = { mtime: SHIPPED_MTIME, nlink: 1 }
  const dir = { type: 'dir', size: 4096, mtime: SHIPPED_MTIME }

  it.each([
    ['/home/rafey/bio.txt', { type: 'text', mode: '-rw-r--r--', owner: 'rafey', group: 'rafey', size: 9, ...shipped }],
    ['/home/rafey/Music/song.mp3', { type: 'audio', mode: '-rw-r--r--', owner: 'rafey', group: 'rafey', size: 2500000, ...shipped }],
    ['/home/rafey', { ...dir, mode: 'drwxr-xr-x', owner: 'rafey', group: 'rafey', nlink: 6 }],
    ['/home/rafey/blog', { ...dir, mode: 'drwxr-xr-x', owner: 'rafey', group: 'rafey', nlink: 2 }],
    ['/usr/local/bin', { ...dir, mode: 'drwxr-xr-x', owner: 'rafey', group: 'rafey', nlink: 2 }],
    ['/usr/local/bin/bio', { type: 'text', mode: '-rwxr-xr-x', owner: 'rafey', group: 'rafey', size: 36, ...shipped }],
    ['/usr/bin/ls', { type: 'text', mode: '-rwxr-xr-x', owner: 'root', group: 'root', size: 24, ...shipped }],
    ['/bin/ls', { type: 'text', mode: '-rwxr-xr-x', owner: 'root', group: 'root', size: 24, ...shipped }],
    ['/bin', { type: 'symlink', mode: 'lrwxrwxrwx', owner: 'root', group: 'root', size: 8, target: '/usr/bin', ...shipped }],
    ['/etc/passwd', { type: 'text', mode: '-rw-r--r--', owner: 'root', group: 'root', size: 124, ...shipped }],
    ['/', { ...dir, mode: 'drwxr-xr-x', owner: 'root', group: 'root', nlink: 6 }],
    ['/tmp', { ...dir, mode: 'drwxrwxrwt', owner: 'root', group: 'root', nlink: 2 }],
    ['/tmp/x', { type: 'text', mode: '-rw-r--r--', owner: 'visitor', group: 'visitor', size: 0, mtime: VISITOR_TIME, nlink: 1 }],
    ['/home/visitor', { ...dir, mode: 'drwxr-xr-x', owner: 'visitor', group: 'visitor', nlink: 6 }],
    ['/home/visitor/Desktop', { ...dir, mode: 'drwxr-xr-x', owner: 'visitor', group: 'visitor', mtime: 0, nlink: 2 }],
    ['/home/visitor/notes.txt', { type: 'text', mode: '-rw-r--r--', owner: 'visitor', group: 'visitor', size: 3, mtime: VISITOR_TIME, nlink: 1 }],
    ['/home/visitor/link', { type: 'symlink', mode: 'lrwxrwxrwx', owner: 'visitor', group: 'visitor', size: 9, target: 'notes.txt', mtime: VISITOR_TIME, nlink: 1 }],
  ])('stat of shipped visitor tmp bin nodes and home itself: %s', (path, facts) => {
    expect(statOf(tree, path)).toEqual(facts)
  })

  it('is null for a path that does not exist', () => {
    expect(statOf(tree, '/home/visitor/nope')).toBeNull()
  })
})

describe('hidden files', () => {
  it('a name starting with a dot is hidden', () => {
    expect(isHidden('/home/visitor/.profile')).toBe(true)
    expect(isHidden('/home/visitor/.config')).toBe(true)
    expect(isHidden('/home/visitor/notes.txt')).toBe(false)
    expect(isHidden('/home/visitor/a.b')).toBe(false)
    expect(isHidden('/')).toBe(false)
  })

  it('a folder counts only the items Files shows', () => {
    const tree = visitorTree()

    expect(sizeLabel(tree, '/home/visitor')).toBe('5 items')
    expect(sizeLabel(tree, '/home/visitor/Desktop')).toBe('0 items')
  })

  it('search and recent documents skip dotfiles', () => {
    const tree = visitorTree()

    expect(search(tree, 'bio')).toEqual(['/home/rafey/bio.txt'])
    expect(search(tree, 'profile')).toEqual([])
    expect(search(tree, 'config')).toEqual([])
    expect(search(tree, 'notes')).toEqual(['/home/visitor/notes.txt'])
    expect(textDocuments(tree)).toContain('/home/visitor/notes.txt')
    expect(textDocuments(tree).filter((path) => path.includes('/.'))).toEqual([])
  })
})
