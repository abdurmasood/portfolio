import { describe, expect, it } from 'vitest'
import { buildVfs } from '@/components/rafeyos/vfs/buildVfs'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'
import { children } from '@/components/rafeyos/vfs/queries'
import {
  DOCUMENTS,
  DOCUMENTS_KEY,
  createDocumentsStore,
  documentName,
  filePath,
  mergeDocuments,
  emptyTrash,
  moveToTrash,
  restoreFromTrash,
  saveChoice,
  trashItemPath,
} from '@/components/rafeyos/vfs/documents'

const storage = (raw = null) => {
  const map = new Map(raw === null ? [] : [[DOCUMENTS_KEY, raw]])
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  }
}

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
  const userPaths = ['~/Documents/notes.txt']
  const blockedPaths = ['~/bio.txt']

  it('writes into the chosen folder, and treats the same name elsewhere as a different file', () => {
    expect(saveChoice({ raw: 'ideas', folder: '~/Desktop', userPaths, openPaths: [], blockedPaths })).toEqual({
      type: 'write',
      name: 'ideas.txt',
      path: '~/Desktop/ideas.txt',
      folder: '~/Desktop',
    })
    expect(saveChoice({ raw: 'notes', folder: '~', userPaths, openPaths: [], blockedPaths }).type).toBe('write')
  })

  it('replaces the visitor\'s file, refuses a shipped one, and refuses one that is open', () => {
    expect(saveChoice({ raw: 'notes', folder: DOCUMENTS, userPaths, openPaths: [], blockedPaths })).toMatchObject({
      type: 'replace',
      path: '~/Documents/notes.txt',
    })
    expect(saveChoice({ raw: 'bio', folder: '~', userPaths, openPaths: ['~/bio.txt'], blockedPaths })).toMatchObject({
      type: 'blocked',
      path: '~/bio.txt',
    })
    expect(saveChoice({ raw: 'notes', folder: DOCUMENTS, userPaths, openPaths: ['~/Documents/notes.txt'], blockedPaths })).toMatchObject({
      type: 'open',
    })
    expect(saveChoice({
      raw: 'notes.txt',
      folder: DOCUMENTS,
      userPaths,
      openPaths: ['~/Documents/notes.txt'],
      blockedPaths,
      currentPath: '~/Documents/notes.txt',
    }).type).toBe('write')
    expect(saveChoice({ raw: 'a/b', folder: DOCUMENTS, userPaths, openPaths: [], blockedPaths }).type).toBe('invalid')
    expect(saveChoice({ raw: 'notes', folder: '~/blog', userPaths, openPaths: [], blockedPaths }).type).toBe('invalid')
  })
})

describe('mergeDocuments', () => {
  const vfs = buildVfs(fixtureContent)

  it('adds a file in the chosen folder, keeps an old Documents name, and leaves shipped files alone', () => {
    const merged = mergeDocuments(vfs, {
      '~/Desktop/note.txt': 'desk\n',
      '~/bio.txt': 'hacked\n',
      'old.txt': 'legacy\n',
    })

    expect(merged).not.toBe(vfs)
    expect(Object.isFrozen(merged)).toBe(true)
    expect(merged['~/Desktop/note.txt']).toMatchObject({ type: 'text', name: 'note.txt', text: 'desk\n', user: true })
    expect(Object.isFrozen(merged['~/Desktop/note.txt'])).toBe(true)
    expect(merged[filePath(DOCUMENTS, 'old.txt')].text).toBe('legacy\n')
    expect(merged['~/bio.txt'].text).toBe('Bio text\n')
    expect(merged['~/bio.txt'].user).toBeUndefined()
    expect(children(merged, '~/Desktop')).toContain('~/Desktop/note.txt')
    expect(children(merged, DOCUMENTS)).toEqual([filePath(DOCUMENTS, 'old.txt')])
  })

  it('ignores a missing, broken or unsafe map', () => {
    expect(mergeDocuments(vfs, null)).toBe(vfs)
    expect(mergeDocuments(vfs, { '../bio.txt': 'nope', 'ok.txt': 1 })).toBe(vfs)
  })

  it('lists a trashed file under Trash and drops it from its folder', () => {
    const merged = mergeDocuments(vfs, {}, { '~/Desktop/note.txt': 'desk\n', '~/Documents/old.txt': 'gone\n' })
    const desk = trashItemPath('~/Desktop/note.txt')
    const docs = trashItemPath('~/Documents/old.txt')

    expect(desk).not.toBe(docs)
    expect(children(merged, '~/Desktop')).not.toContain('~/Desktop/note.txt')
    expect(children(merged, 'trash')).toEqual(expect.arrayContaining([desk, docs]))
    expect(merged[desk]).toMatchObject({ name: 'note.txt', text: 'desk\n', user: true, trashedFrom: '~/Desktop/note.txt' })
    expect(merged[docs]).toMatchObject({ name: 'old.txt', text: 'gone\n', user: true, trashedFrom: '~/Documents/old.txt' })
    expect(Object.isFrozen(merged[desk])).toBe(true)
  })
})

describe('moveToTrash and restoreFromTrash', () => {
  const state = { files: { '~/Desktop/notes.txt': 'hello\n' }, trash: { '~/Documents/old.txt': 'gone\n' } }

  it('moves a live file into trash without changing the previous state', () => {
    expect(moveToTrash(state, '~/Desktop/notes.txt')).toEqual({
      files: {},
      trash: { '~/Documents/old.txt': 'gone\n', '~/Desktop/notes.txt': 'hello\n' },
    })
    expect(moveToTrash(state, '~/Desktop/missing.txt')).toBeNull()
    expect(state.files).toEqual({ '~/Desktop/notes.txt': 'hello\n' })
  })

  it('restores a free path and refuses one that is taken', () => {
    const trashed = { files: {}, trash: { '~/Desktop/notes.txt': 'hello\n' } }

    expect(restoreFromTrash(trashed, '~/Desktop/notes.txt', [])).toEqual({
      ok: true,
      state: { files: { '~/Desktop/notes.txt': 'hello\n' }, trash: {} },
    })
    expect(restoreFromTrash(trashed, '~/Desktop/notes.txt', ['~/Desktop/notes.txt'])).toEqual({ ok: false, reason: 'taken' })
    expect(restoreFromTrash(
      { files: { '~/Desktop/notes.txt': 'other\n' }, trash: { '~/Desktop/notes.txt': 'hello\n' } },
      '~/Desktop/notes.txt',
      [],
    )).toEqual({ ok: false, reason: 'taken' })
    expect(restoreFromTrash(trashed, '~/Desktop/missing.txt', [])).toEqual({ ok: false, reason: 'missing' })
    expect(trashed.trash).toEqual({ '~/Desktop/notes.txt': 'hello\n' })
  })

  it('drops every trashed file and leaves live files alone', () => {
    expect(emptyTrash(state)).toEqual({ files: { '~/Desktop/notes.txt': 'hello\n' }, trash: {} })
    expect(emptyTrash({ files: {}, trash: {} })).toBeNull()
    expect(state.trash).toEqual({ '~/Documents/old.txt': 'gone\n' })
  })
})

describe('createDocumentsStore', () => {
  it('loads an empty map when storage is missing or the JSON is bad', () => {
    expect(createDocumentsStore(null).load()).toEqual({ files: {}, trash: {} })
    expect(createDocumentsStore(storage('nope')).load()).toEqual({ files: {}, trash: {} })
    expect(createDocumentsStore(storage('[]')).load()).toEqual({ files: {}, trash: {} })
    expect(createDocumentsStore(storage('{ "a/b.txt": "x", "ok.txt": 1 }')).load()).toEqual({ files: {}, trash: {} })
  })

  it('round-trips saved files and reports a failed write', () => {
    const disk = storage()
    const store = createDocumentsStore(disk)
    const saved = { files: { '~/Desktop/notes.txt': 'hello\n' }, trash: { '~/Documents/old.txt': 'gone\n' } }

    expect(store.save(saved)).toBe(true)
    expect(store.load()).toEqual(saved)
    expect(createDocumentsStore(storage('{ "notes.txt": "old\\n" }')).load()).toEqual({
      files: { '~/Documents/notes.txt': 'old\n' },
      trash: {},
    })
    expect(createDocumentsStore(storage('{ "~/Desktop/notes.txt": "flat\\n" }')).load()).toEqual({
      files: { '~/Desktop/notes.txt': 'flat\n' },
      trash: {},
    })

    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(createDocumentsStore(blocked).save({ 'notes.txt': 'x' })).toBe(false)
  })
})
