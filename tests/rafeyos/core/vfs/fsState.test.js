import { describe, expect, it } from 'vitest'
import {
  emptyTrash,
  mergeLegacy,
  mergeState,
  migrateLegacy,
  moveToTrash,
  parseState,
  restoreFromTrash,
  saveFile,
  seedState,
  serializeState,
} from '@/components/rafeyos/core/vfs/fsState'
import { readLegacy } from '@/components/rafeyos/core/vfs/legacyDocuments'
import { trashItemPath } from '@/components/rafeyos/core/vfs/documents'
import { buildVfs } from '@/components/rafeyos/core/vfs/buildVfs'
import { fixtureContent, realVfs } from '@/tests/rafeyos/helpers/testVfs'

const SEEDED = {
  '/home/visitor/Desktop': { type: 'dir', mtime: 1 },
  '/home/visitor/Documents': { type: 'dir', mtime: 1 },
  '/home/visitor/Downloads': { type: 'dir', mtime: 1 },
}

// A state as the store would read it back, built through parseState so the tests stay on the public API
const stateWith = (nodes = {}, trash = {}) => parseState({ v: 2, nodes: { ...SEEDED, ...nodes }, trash })

const text = (value, mtime = 1) => ({ type: 'text', text: value, mtime })
const dir = (mtime = 1) => ({ type: 'dir', mtime })
const symlink = (target, mtime = 1) => ({ type: 'symlink', target, mtime })
const copy = (from, mtime = 1) => ({ type: 'copy', from, mtime })
/** A v2 trash entry: the node as it was, plus when it was trashed. */
const trashed = (node, mtime = 1) => ({ node, mtime })

const SONG = '/home/rafey/Music/song.mp3'
const fixtureVfs = buildVfs(fixtureContent)

describe('seedState', () => {
  it('seeds three empty folders on first visit', () => {
    const state = seedState(1)
    expect(state).toEqual({ v: 2, nodes: SEEDED, trash: {} })
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(state.nodes)).toBe(true)
    expect(Object.isFrozen(state.nodes['/home/visitor/Desktop'])).toBe(true)
  })
})

describe('parseState', () => {
  it('returns null for anything but a version 1 or 2 envelope', () => {
    ;[null, 'text', [], { nodes: {}, trash: {} }, { v: 3, nodes: {}, trash: {} }, { v: '2', nodes: {}, trash: {} }].forEach((raw) => {
      expect(parseState(raw)).toBeNull()
    })
  })

  it('reads missing or junk lists as empty', () => {
    expect(parseState({ v: 2 })).toEqual({ v: 2, nodes: {}, trash: {} })
    expect(parseState({ v: 2, nodes: 'x', trash: [1] })).toEqual({ v: 2, nodes: {}, trash: {} })
  })

  it('parses v1 and upgrades to v2', () => {
    const state = parseState({
      v: 1,
      nodes: { ...SEEDED, '/home/visitor/Desktop/a.txt': text('a', 2) },
      trash: { '/home/visitor/b.txt': { text: 'b', mtime: 3 } },
    })
    expect(state).toEqual({
      v: 2,
      nodes: { ...SEEDED, '/home/visitor/Desktop/a.txt': text('a', 2) },
      trash: { '/home/visitor/b.txt': trashed(text('b', 3), 3) },
    })
  })

  it('accepts dotfiles and extensionless names', () => {
    const nodes = {
      '/home/visitor/.bash_history': text('ls\n'),
      '/home/visitor/Makefile': text('all:'),
      '/home/visitor/notes': text('n'),
      '/home/visitor/ spaced ': dir(),
      '/home/visitor/.config': dir(),
      '/home/visitor/.config/settings': text('x'),
      [`/home/visitor/${'a'.repeat(255)}`]: text('longest name'),
      '/home/visitor/link': symlink('../rafey/bio.txt'),
      '/home/visitor/song.mp3': copy(SONG),
      '/tmp/x': text('t'),
      '/tmp/d': dir(),
      '/tmp/d/y': symlink('/etc/passwd'),
    }
    const trash = {
      '/home/visitor/Makefile.old': trashed(text('old'), 2),
      '/home/visitor/.hidden': trashed(copy(SONG), 2),
      '/home/visitor/l': trashed(symlink('x'), 2),
    }
    const state = stateWith(nodes, trash)
    expect(state.nodes).toEqual({ ...SEEDED, ...nodes })
    expect(state.trash).toEqual(trash)
  })

  it('rejects bad segments and paths outside home and tmp', () => {
    const outside = ['/home/rafey/x.txt', '/etc/x.txt', '../x.txt', '/home/visitor', '/home/visitor/', '/home/visitorx/a.txt',
      '/home/visitor//a.txt', '/home/visitor/./a.txt', '/home/visitor/Desktop/../a.txt', '/home/visitor/..', 'a.txt', '~/a.txt',
      '/tmp', '/tmp/', '/tmpx/a', '/tmp/../etc/x', `/home/visitor/${'a'.repeat(256)}`, '/home/visitor/a\0b']
    const nodes = Object.fromEntries(outside.map((path) => [path, text('x')]))
    const trash = Object.fromEntries([...outside, '/tmp/t.txt'].map((path) => [path, trashed(text('x'))]))
    const state = stateWith({ ...nodes, '/home/visitor/keep.txt': text('k') }, { ...trash, '/home/visitor/gone.txt': trashed(text('g'), 2) })
    expect(state.nodes).toEqual({ ...SEEDED, '/home/visitor/keep.txt': text('k') })
    expect(state.trash).toEqual({ '/home/visitor/gone.txt': trashed(text('g'), 2) })
  })

  it('drops junk nodes and junk trash entries', () => {
    const state = stateWith(
      {
        '/home/visitor/a.txt': { type: 'audio', mtime: 1 },
        '/home/visitor/b.txt': { type: 'text', text: 3, mtime: 1 },
        '/home/visitor/c.txt': { type: 'text', text: 'c' },
        '/home/visitor/d.txt': 'd',
        '/home/visitor/e.txt': { type: 'text', text: 'e', mtime: Number.NaN },
        '/home/visitor/f': { type: 'symlink', target: '', mtime: 1 },
        '/home/visitor/g': { type: 'symlink', target: 7, mtime: 1 },
        '/home/visitor/h': { type: 'copy', from: 'Music/song.mp3', mtime: 1 },
        '/home/visitor/i': { type: 'copy', mtime: 1 },
      },
      {
        '/home/visitor/t.txt': { text: 1, mtime: 1 },
        '/home/visitor/u.txt': 'u',
        '/home/visitor/v.txt': trashed(dir()),
        '/home/visitor/w.txt': trashed(text('w'), 'later'),
        '/home/visitor/x.txt': { node: 'x', mtime: 1 },
      },
    )
    expect(state).toEqual({ v: 2, nodes: SEEDED, trash: {} })
  })

  it('drops orphans whose parent folder is missing', () => {
    const state = stateWith({
      '/home/visitor/Desktop/sub/deep/a.txt': text('orphan'),
      '/home/visitor/Desktop/a.txt/b.txt': text('under a file'),
      '/home/visitor/Desktop/a.txt': text('a'),
      '/home/visitor/Projects/kept/b.txt': text('b'),
      '/home/visitor/Projects/kept': { type: 'dir', mtime: 1 },
      '/home/visitor/Projects': { type: 'dir', mtime: 1 },
    })
    expect(Object.keys(state.nodes).sort()).toEqual([
      '/home/visitor/Desktop',
      '/home/visitor/Desktop/a.txt',
      '/home/visitor/Documents',
      '/home/visitor/Downloads',
      '/home/visitor/Projects',
      '/home/visitor/Projects/kept',
      '/home/visitor/Projects/kept/b.txt',
    ])
  })
})

describe('serializeState', () => {
  it('serialize then parse round trips', () => {
    const state = stateWith(
      { '/home/visitor/Desktop/a.txt': text('a', 7), '/home/visitor/l': symlink('Desktop'), '/home/visitor/s.mp3': copy(SONG) },
      { '/home/visitor/b.txt': trashed(text('b'), 8) },
    )
    expect(parseState(JSON.parse(serializeState(state)))).toEqual(state)
  })

  it('never serialises tmp', () => {
    const state = stateWith({ '/tmp/x': text('t'), '/tmp/d': dir(), '/tmp/d/y': text('y'), '/home/visitor/a.txt': text('a') })
    expect(JSON.parse(serializeState(state))).toEqual({ v: 2, nodes: { ...SEEDED, '/home/visitor/a.txt': text('a') }, trash: {} })
  })
})

describe('migrateLegacy', () => {
  it('migrates tilde paths and trash', () => {
    const legacy = readLegacy({ files: { '~/Desktop/a.txt': 'a', 'notes.txt': 'n' }, trash: { '~/old.txt': 'o' } })
    expect(migrateLegacy(legacy, 5)).toEqual({
      v: 2,
      nodes: {
        '/home/visitor/Desktop': { type: 'dir', mtime: 5 },
        '/home/visitor/Documents': { type: 'dir', mtime: 5 },
        '/home/visitor/Downloads': { type: 'dir', mtime: 5 },
        '/home/visitor/Desktop/a.txt': text('a', 5),
        '/home/visitor/Documents/notes.txt': text('n', 5),
      },
      trash: { '/home/visitor/old.txt': trashed(text('o', 5), 5) },
    })
  })

  it('seeds the folders when there is nothing to migrate', () => {
    expect(migrateLegacy({ files: {}, trash: {} }, 1)).toEqual(seedState(1))
  })
})

describe('mergeLegacy', () => {
  it('merge legacy adds only free paths', () => {
    const state = stateWith({ '/home/visitor/Desktop/live.txt': text('mine') }, { '/home/visitor/gone.txt': trashed(text('trashed')) })
    const merged = mergeLegacy(state, {
      files: {
        '/home/visitor/Desktop/live.txt': 'old tab',
        '/home/visitor/gone.txt': 'old tab',
        '/home/visitor/Documents/new.txt': 'new',
        '/home/rafey/bio.txt': 'not ours',
      },
      trash: { '/home/visitor/gone.txt': 'old tab', '/home/visitor/t.txt': 't' },
    }, 9)
    expect(merged.nodes['/home/visitor/Desktop/live.txt']).toEqual(text('mine'))
    expect(merged.nodes['/home/visitor/gone.txt']).toBeUndefined()
    expect(merged.nodes['/home/visitor/Documents/new.txt']).toEqual(text('new', 9))
    expect(merged.nodes['/home/rafey/bio.txt']).toBeUndefined()
    expect(merged.trash).toEqual({
      '/home/visitor/gone.txt': trashed(text('trashed')),
      '/home/visitor/t.txt': trashed(text('t', 9), 9),
    })
  })

  it('skips legacy trash whose path is live again', () => {
    const state = stateWith({ '/home/visitor/a.txt': text('restored') })
    const merged = mergeLegacy(state, { files: {}, trash: { '/home/visitor/a.txt': 'stale' } }, 4)
    expect(merged).toBe(state)
    expect(merged.trash).toEqual({})
  })

  it('returns the same state when nothing is new', () => {
    const state = stateWith({ '/home/visitor/a.txt': text('a') })
    expect(mergeLegacy(state, { files: { '/home/visitor/a.txt': 'old' }, trash: {} }, 2)).toBe(state)
  })

  it('returns the same state when every free legacy file is refused', () => {
    const state = stateWith({ '/home/visitor/a.txt': text('a') })
    expect(mergeLegacy(state, { files: { '/home/visitor/a.txt/b.txt': 'under a file' }, trash: {} }, 2)).toBe(state)
  })

  it('keeps the live file when legacy has a file and trash at one path', () => {
    const state = seedState(1)
    const merged = mergeLegacy(state, { files: { '/home/visitor/x.txt': 'live' }, trash: { '/home/visitor/x.txt': 'old' } }, 6)
    expect(merged.nodes['/home/visitor/x.txt']).toEqual(text('live', 6))
    expect(merged.trash).toEqual({})
  })

  it('recreates a save folder the state is missing', () => {
    const state = parseState({ v: 1, nodes: {}, trash: {} })
    const merged = mergeLegacy(state, { files: { '/home/visitor/Desktop/a.txt': 'a' }, trash: {} }, 3)
    expect(merged.nodes).toEqual({ '/home/visitor/Desktop': { type: 'dir', mtime: 3 }, '/home/visitor/Desktop/a.txt': text('a', 3) })
  })
})

describe('saveFile', () => {
  it('writes a new file, adding .txt, without touching the old state', () => {
    const state = seedState(1)
    const result = saveFile(state, '/home/visitor/Desktop', 'ideas', 'hi', 4)
    expect(result).toEqual({
      ok: true,
      state: { ...state, nodes: { ...SEEDED, '/home/visitor/Desktop/ideas.txt': text('hi', 4) } },
      path: '/home/visitor/Desktop/ideas.txt',
      name: 'ideas.txt',
    })
    expect(state.nodes['/home/visitor/Desktop/ideas.txt']).toBeUndefined()
    expect(Object.isFrozen(result.state.nodes)).toBe(true)
  })

  it('saves straight into home', () => {
    expect(saveFile(seedState(1), '/home/visitor', 'a.txt', 'a', 2).path).toBe('/home/visitor/a.txt')
  })

  it('save replaces existing visitor file', () => {
    const state = stateWith({ '/home/visitor/Documents/notes.txt': text('old', 1) })
    const result = saveFile(state, '/home/visitor/Documents', 'notes.txt', 'new', 2)
    expect(result.ok).toBe(true)
    expect(result.state.nodes['/home/visitor/Documents/notes.txt']).toEqual(text('new', 2))
    expect(Object.keys(result.state.nodes)).toHaveLength(4)
  })

  it('save refuses non save folder and missing folder', () => {
    const state = seedState(1)
    expect(saveFile(state, '/home/rafey', 'a.txt', 'a', 2)).toEqual({ ok: false, reason: 'invalid' })
    expect(saveFile(state, '/home/visitor/Downloads', 'a.txt', 'a', 2)).toEqual({ ok: false, reason: 'invalid' })
    expect(saveFile(state, '/home/visitor/Desktop', 'a/b', 'a', 2)).toEqual({ ok: false, reason: 'invalid' })
    const noDesktop = parseState({ v: 1, nodes: {}, trash: {} })
    expect(saveFile(noDesktop, '/home/visitor/Desktop', 'a.txt', 'a', 2)).toEqual({ ok: false, reason: 'missing' })
  })

  it('refuses a path a folder holds', () => {
    const state = stateWith({ '/home/visitor/Desktop/box.d': { type: 'dir', mtime: 1 } })
    expect(saveFile(state, '/home/visitor/Desktop', 'box.d', 'a', 2)).toEqual({ ok: false, reason: 'taken' })
  })
})

describe('moveToTrash', () => {
  it('moves the file into trash, replacing an older entry for the same path', () => {
    const state = stateWith({ '/home/visitor/a.txt': text('new') }, { '/home/visitor/a.txt': trashed(text('older')) })
    const result = moveToTrash(state, '/home/visitor/a.txt', 6)
    expect(result).toEqual({
      ok: true,
      state: { v: 2, nodes: SEEDED, trash: { '/home/visitor/a.txt': trashed(text('new'), 6) } },
      path: '/home/visitor/a.txt',
    })
  })

  it('trash refuses folders', () => {
    const state = stateWith({ '/home/visitor/box.d': { type: 'dir', mtime: 1 } })
    expect(moveToTrash(state, '/home/visitor/Desktop', 2)).toEqual({ ok: false, reason: 'invalid' })
    expect(moveToTrash(state, '/home/visitor/box.d', 2)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('refuses paths outside visitor home and reports a missing file', () => {
    expect(moveToTrash(seedState(1), '/home/rafey/bio.txt', 2)).toEqual({ ok: false, reason: 'invalid' })
    expect(moveToTrash(stateWith({ '/tmp/x': text('t') }), '/tmp/x', 2)).toEqual({ ok: false, reason: 'invalid' })
    expect(moveToTrash(seedState(1), '/home/visitor/none.txt', 2)).toEqual({ ok: false, reason: 'missing' })
  })
})

describe('restoreFromTrash', () => {
  it('puts the file back and clears its trash entry', () => {
    const state = stateWith({}, { '/home/visitor/Desktop/a.txt': trashed(text('a')) })
    const result = restoreFromTrash(state, '/home/visitor/Desktop/a.txt', 3)
    expect(result).toEqual({
      ok: true,
      state: { v: 2, nodes: { ...SEEDED, '/home/visitor/Desktop/a.txt': text('a', 3) }, trash: {} },
      path: '/home/visitor/Desktop/a.txt',
    })
  })

  it('restores into recreated parent folder', () => {
    const state = parseState({ v: 2, nodes: {}, trash: { '/home/visitor/Documents/drafts/a.txt': trashed(text('a')) } })
    const result = restoreFromTrash(state, '/home/visitor/Documents/drafts/a.txt', 4)
    expect(result.state.nodes).toEqual({
      '/home/visitor/Documents': { type: 'dir', mtime: 4 },
      '/home/visitor/Documents/drafts': { type: 'dir', mtime: 4 },
      '/home/visitor/Documents/drafts/a.txt': text('a', 4),
    })
  })

  it('restore refuses when path taken', () => {
    const state = stateWith({ '/home/visitor/Desktop/a.txt': text('live') }, { '/home/visitor/Desktop/a.txt': trashed(text('old')) })
    expect(restoreFromTrash(state, '/home/visitor/Desktop/a.txt', 2)).toEqual({ ok: false, reason: 'taken' })
    const fileInTheWay = stateWith({ '/home/visitor/a.txt': text('file') }, { '/home/visitor/a.txt/b.txt': trashed(text('b')) })
    expect(restoreFromTrash(fileInTheWay, '/home/visitor/a.txt/b.txt', 2)).toEqual({ ok: false, reason: 'taken' })
  })

  it('reports missing when there is nothing to restore', () => {
    expect(restoreFromTrash(seedState(1), '/home/visitor/a.txt', 2)).toEqual({ ok: false, reason: 'missing' })
    expect(restoreFromTrash(seedState(1), 'constructor', 2)).toEqual({ ok: false, reason: 'missing' })
  })
})

describe('emptyTrash', () => {
  it('drops every trashed file and keeps the live ones', () => {
    const state = stateWith({ '/home/visitor/a.txt': text('a') }, { '/home/visitor/b.txt': trashed(text('b')) })
    const result = emptyTrash(state)
    expect(result).toEqual({ ok: true, state: { ...state, trash: {} } })
  })

  it('reports empty when there is nothing to remove', () => {
    expect(emptyTrash(seedState(1))).toEqual({ ok: false, reason: 'empty' })
  })
})

describe('mergeState', () => {
  it('merge leaves folders without user flag and marks files user', () => {
    const state = stateWith(
      { '/home/visitor/Downloads/a.txt': text('a', 2) },
      { '/home/visitor/Desktop/b.txt': trashed(text('b', 2), 3) },
    )
    const vfs = mergeState(realVfs, state)
    expect(vfs['/home/visitor/Downloads']).toEqual({ path: '/home/visitor/Downloads', name: 'Downloads', type: 'dir', mtime: 1 })
    expect(vfs['/home/visitor/Downloads/a.txt']).toEqual({
      path: '/home/visitor/Downloads/a.txt', name: 'a.txt', type: 'text', text: 'a', mtime: 2, user: true,
    })
    const binned = trashItemPath('/home/visitor/Desktop/b.txt')
    expect(vfs[binned]).toEqual({
      path: binned, name: 'b.txt', type: 'text', text: 'b', mtime: 3, user: true, trashedFrom: '/home/visitor/Desktop/b.txt',
    })
    expect(Object.isFrozen(vfs)).toBe(true)
    expect(Object.isFrozen(vfs['/home/visitor/Downloads/a.txt'])).toBe(true)
  })

  it('never covers a shipped node', () => {
    // The shipped tree no longer has a visitor folder, so one is planted to prove the shipped node wins
    const shipped = Object.freeze({ path: '/home/visitor/Desktop', name: 'Desktop', type: 'dir' })
    const vfs = mergeState(Object.freeze({ ...realVfs, [shipped.path]: shipped }), seedState(1))
    expect(vfs['/home/visitor/Desktop']).toBe(shipped)
    expect(vfs['/home/rafey/bio.txt']).toBe(realVfs['/home/rafey/bio.txt'])
    expect(vfs['/home/visitor/Downloads']).toEqual({ path: '/home/visitor/Downloads', name: 'Downloads', type: 'dir', mtime: 1 })
  })
})

describe('v2 nodes in the merged tree', () => {
  it('merges symlinks and copies of shipped files', () => {
    const state = stateWith({
      '/home/visitor/p': symlink('/etc/passwd', 2),
      '/home/visitor/song.mp3': copy(SONG, 4),
      '/tmp/t.txt': text('t'),
      '/tmp/l': symlink('t.txt'),
      '/tmp/s.mp3': copy(SONG),
    })
    const vfs = mergeState(fixtureVfs, state)
    expect(vfs['/home/visitor/p']).toEqual({ path: '/home/visitor/p', name: 'p', type: 'symlink', target: '/etc/passwd', mtime: 2, user: true })
    expect(vfs['/home/visitor/song.mp3']).toEqual({ ...fixtureVfs[SONG], path: '/home/visitor/song.mp3', name: 'song.mp3', mtime: 4, user: true })
    // Trash stays a place for the visitor's home, so nothing in /tmp is offered to it
    expect(vfs['/tmp/t.txt']).toEqual({ path: '/tmp/t.txt', name: 't.txt', type: 'text', text: 't', mtime: 1 })
    expect(vfs['/tmp/l']).toEqual({ path: '/tmp/l', name: 'l', type: 'symlink', target: 't.txt', mtime: 1 })
    expect(vfs['/tmp/s.mp3'].user).toBeUndefined()
  })

  it('drops copy whose source is gone', () => {
    const state = stateWith(
      { '/home/visitor/a.mp3': copy('/home/rafey/Music/gone.mp3'), '/home/visitor/b': copy('/home/rafey/Music') },
      { '/home/visitor/c.mp3': trashed(copy('/home/rafey/gone.mp3')) },
    )
    const vfs = mergeState(fixtureVfs, state)
    expect(vfs['/home/visitor/a.mp3']).toBeUndefined()
    expect(vfs['/home/visitor/b']).toBeUndefined()
    expect(vfs[trashItemPath('/home/visitor/c.mp3')]).toBeUndefined()
  })

  it('trashes and restores copy extensionless and symlink files', () => {
    const files = { '/home/visitor/Makefile': text('all:'), '/home/visitor/song.mp3': copy(SONG), '/home/visitor/link': symlink('Makefile') }
    const binned = Object.keys(files).reduce((state, path) => moveToTrash(state, path, 6).state, stateWith(files))
    expect(binned.nodes).toEqual(SEEDED)
    expect(binned.trash).toEqual(Object.fromEntries(Object.entries(files).map(([path, node]) => [path, trashed(node, 6)])))

    const vfs = mergeState(fixtureVfs, binned)
    expect(vfs[trashItemPath('/home/visitor/song.mp3')]).toMatchObject({
      type: 'audio', src: fixtureVfs[SONG].src, name: 'song.mp3', user: true, trashedFrom: '/home/visitor/song.mp3', mtime: 6,
    })
    expect(vfs[trashItemPath('/home/visitor/link')]).toMatchObject({ type: 'symlink', target: 'Makefile', trashedFrom: '/home/visitor/link' })

    const restored = Object.keys(files).reduce((state, path) => restoreFromTrash(state, path, 7).state, binned)
    expect(restored.nodes).toEqual({ ...SEEDED, ...Object.fromEntries(Object.entries(files).map(([path, node]) => [path, { ...node, mtime: 7 }])) })
    expect(restored.trash).toEqual({})
  })

  it('restore recreates the missing folders of a trashed link', () => {
    const state = parseState({ v: 2, nodes: {}, trash: { '/home/visitor/a/b/link': trashed(symlink('/etc')) } })
    expect(restoreFromTrash(state, '/home/visitor/a/b/link', 3).state.nodes).toEqual({
      '/home/visitor/a': dir(3),
      '/home/visitor/a/b': dir(3),
      '/home/visitor/a/b/link': symlink('/etc', 3),
    })
  })
})
