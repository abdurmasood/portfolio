import { describe, expect, it } from 'vitest'
import { readLegacy } from '@/components/rafeyos/core/vfs/legacyDocuments'

describe('readLegacy', () => {
  it('reads bare names as documents', () => {
    expect(readLegacy({ 'notes.txt': 'a' })).toEqual({
      files: { '/home/visitor/Documents/notes.txt': 'a' },
      trash: {},
    })
  })

  it('maps ~ keys in both lists of an envelope to the visitor home', () => {
    const raw = {
      files: { '~/x.txt': 'x', '~/Desktop/a.md': 'a' },
      trash: { '~/Documents/old.txt': 'old' },
    }
    expect(readLegacy(raw)).toEqual({
      files: { '/home/visitor/x.txt': 'x', '/home/visitor/Desktop/a.md': 'a' },
      trash: { '/home/visitor/Documents/old.txt': 'old' },
    })
  })

  it('keeps absolute keys written after home moved to /home/visitor', () => {
    expect(readLegacy({ files: { '/home/visitor/Desktop/a.txt': 'a' }, trash: {} }).files).toEqual({
      '/home/visitor/Desktop/a.txt': 'a',
    })
  })

  it('drops junk values, names the old build never saved, and paths outside the save folders', () => {
    const raw = {
      files: {
        '~/ok.txt': 'ok',
        '~/num.txt': 3,
        '~/Desktop/x': 'no extension, so the old build never showed it',
        '~/Downloads/a.txt': 'not a save folder before',
        '/home/rafey/bio.txt': 'shipped',
        '/etc/passwd': 'system',
        '~/Desktop/../a.txt': 'not normalised',
        'Desktop/a.txt': 'relative',
      },
      trash: { '~/t.txt': 't', '/etc/x.txt': 'x', '~/bad.txt': null },
    }
    expect(readLegacy(raw)).toEqual({
      files: { '/home/visitor/ok.txt': 'ok' },
      trash: { '/home/visitor/t.txt': 't' },
    })
  })

  it('keeps the files of an envelope whose trash is junk', () => {
    expect(readLegacy({ files: { '~/a.txt': 'a' }, trash: 'junk' })).toEqual({
      files: { '/home/visitor/a.txt': 'a' },
      trash: {},
    })
  })

  it('reads anything that is not an object as empty', () => {
    ;[null, undefined, 'text', 42, ['notes.txt'], true].forEach((raw) => {
      expect(readLegacy(raw)).toEqual({ files: {}, trash: {} })
    })
  })
})
