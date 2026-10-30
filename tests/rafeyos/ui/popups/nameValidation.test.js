import { describe, expect, it } from 'vitest'
import { checkName } from '@/components/rafeyos/ui/popups/logic/nameValidation'

const folder = (name, existing) => checkName(name, { isFolder: true, existing })
const file = (name, existing) => checkName(name, { isFolder: false, existing })

describe('checkName', () => {
  it('accepts a plain name', () => {
    expect(folder('Projects')).toEqual({ ok: true, message: null })
    expect(file('notes.txt')).toEqual({ ok: true, message: null })
  })

  it('refuses an empty name without a message', () => {
    expect(folder('')).toEqual({ ok: false, message: null })
  })

  it('refuses dot names, slashes and long names in Nautilus words', () => {
    expect(folder('.')).toEqual({ ok: false, message: 'A folder cannot be called “.”.' })
    expect(file('..')).toEqual({ ok: false, message: 'A file cannot be called “..”.' })
    expect(folder('a/b')).toEqual({ ok: false, message: 'Folder names cannot contain “/”.' })
    expect(file('x'.repeat(256))).toEqual({ ok: false, message: 'File name is too long.' })
    expect(file('x'.repeat(255)).ok).toBe(true)
  })

  it('names the kind of item already holding the name', () => {
    expect(file('a', { type: 'dir' })).toEqual({ ok: false, message: 'A folder with that name already exists.' })
    expect(folder('a', { type: 'text' })).toEqual({ ok: false, message: 'A file with that name already exists.' })
  })

  it('warns that a leading dot hides the item, but allows it', () => {
    expect(folder('.config')).toEqual({ ok: true, message: 'Folders with “.” at the beginning of their name are hidden.' })
    expect(file('.bashrc')).toEqual({ ok: true, message: 'Files with “.” at the beginning of their name are hidden.' })
  })
})
