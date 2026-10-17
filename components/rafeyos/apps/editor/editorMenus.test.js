import { describe, expect, it, vi } from 'vitest'
import { documentLabel, editorMenuItems, folderLabel, recentDocumentItems } from './editorMenus'
import { editorTitle } from './EditorApp'
import { realVfs } from '../../vfs/testVfs'

describe('editor menus', () => {
  it('labels documents by name and folder', () => {
    expect(documentLabel(realVfs, '~/bio.txt')).toBe('bio.txt   ~')
    expect(documentLabel(realVfs, '~/Music/story.txt')).toBe('story.txt   ~/Music')
    expect(folderLabel('~/Music/story.txt')).toBe('~/Music/')
    expect(folderLabel('~')).toBe('~/')
  })

  it('opens the picked recent document', () => {
    const open = vi.fn()
    const [heading, ...items] = recentDocumentItems(realVfs, open)

    expect(heading).toMatchObject({ kind: 'heading', label: 'Recent Documents' })
    items.find((item) => item.label === 'skills.txt   ~').action()

    expect(open).toHaveBeenCalledWith('~/skills.txt')
  })

  it('disables what a read-only editor cannot do', () => {
    const items = editorMenuItems({ showInFiles: vi.fn(), openTerminal: vi.fn() })

    expect(items.filter((item) => item.disabled).map((item) => item.label)).toEqual(['Save', 'Preferences', 'About Text Editor'])
  })

  it('marks an edited title', () => {
    expect(editorTitle('a.txt', true)).toBe('• a.txt')
    expect(editorTitle('a.txt', false)).toBe('a.txt')
  })
})
