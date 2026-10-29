import { describe, expect, it } from 'vitest'
import { DOCUMENTS, documentName, filePath, saveChoice, trashItemPath } from '@/components/rafeyos/core/vfs/documents'

describe('documentName', () => {
  it('trims and adds .txt when there is no extension', () => {
    expect(documentName('  notes  ')).toEqual({ ok: true, name: 'notes.txt' })
    expect(documentName('notes.txt')).toEqual({ ok: true, name: 'notes.txt' })
    expect(documentName('draft.md')).toEqual({ ok: true, name: 'draft.md' })
  })

  it('rejects empty names, dots and slashes', () => {
    ;['', '   ', '.', '..', 'a/b', 'a\\b'].forEach((name) => {
      expect(documentName(name).ok).toBe(false)
    })
  })
})

describe('saveChoice', () => {
  const userPaths = ['/home/visitor/Documents/notes.txt']
  // A shipped path the caller reports in a save folder (the vfs has none there today)
  const blockedPaths = ['/home/visitor/bio.txt']

  it('writes into the chosen folder, and treats the same name elsewhere as a different file', () => {
    expect(saveChoice({ raw: 'ideas', folder: '/home/visitor/Desktop', userPaths, openPaths: [], blockedPaths })).toEqual({
      type: 'write',
      name: 'ideas.txt',
      path: '/home/visitor/Desktop/ideas.txt',
      folder: '/home/visitor/Desktop',
    })
    expect(saveChoice({ raw: 'notes', folder: '/home/visitor', userPaths, openPaths: [], blockedPaths }).type).toBe('write')
  })

  it('replaces the visitor\'s file, refuses a shipped one, and refuses one that is open', () => {
    expect(saveChoice({ raw: 'notes', folder: DOCUMENTS, userPaths, openPaths: [], blockedPaths })).toMatchObject({
      type: 'replace',
      path: '/home/visitor/Documents/notes.txt',
    })
    expect(saveChoice({ raw: 'bio', folder: '/home/visitor', userPaths, openPaths: ['/home/visitor/bio.txt'], blockedPaths })).toMatchObject({
      type: 'blocked',
      path: '/home/visitor/bio.txt',
    })
    expect(saveChoice({ raw: 'notes', folder: DOCUMENTS, userPaths, openPaths: ['/home/visitor/Documents/notes.txt'], blockedPaths })).toMatchObject({
      type: 'open',
    })
    expect(saveChoice({ raw: 'a/b', folder: DOCUMENTS, userPaths, openPaths: [], blockedPaths }).type).toBe('invalid')
    expect(saveChoice({ raw: 'notes', folder: '/home/rafey/blog', userPaths, openPaths: [], blockedPaths }).type).toBe('invalid')
  })
})

describe('filePath and trashItemPath', () => {
  it('joins a folder and a name, and gives each trashed file its own single-segment Trash path', () => {
    const desk = trashItemPath('/home/visitor/Desktop/note.txt')
    const docs = trashItemPath('/home/visitor/Documents/note.txt')

    expect(filePath(DOCUMENTS, 'old.txt')).toBe('/home/visitor/Documents/old.txt')
    expect(desk).not.toBe(docs)
    expect(desk.split('/')).toHaveLength(2)
    expect(desk.startsWith('trash/')).toBe(true)
  })
})
