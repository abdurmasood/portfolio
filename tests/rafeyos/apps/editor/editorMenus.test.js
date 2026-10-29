import { describe, expect, it, vi } from 'vitest'
import { documentLabel, editorMenuItems, folderLabel, recentDocumentItems } from '@/components/rafeyos/apps/editor/logic/editorMenus'
import { editorTitle } from '@/components/rafeyos/apps/editor/EditorApp'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'

describe('editor menus', () => {
  it('labels documents by name and folder', () => {
    expect(documentLabel(realVfs, '/home/rafey/bio.txt')).toBe('bio.txt   /home/rafey')
    expect(documentLabel(realVfs, '/home/rafey/Music/story.txt')).toBe('story.txt   /home/rafey/Music')
    expect(folderLabel('/home/rafey/Music/story.txt')).toBe('/home/rafey/Music/')
    expect(folderLabel('/home/visitor/notes.txt')).toBe('~/')
    expect(folderLabel('/home/visitor/Desktop/notes.txt')).toBe('~/Desktop/')
  })

  it('opens the picked recent document', () => {
    const open = vi.fn()
    const [heading, ...items] = recentDocumentItems(realVfs, open)

    expect(heading).toMatchObject({ kind: 'heading', label: 'Recent Documents' })
    items.find((item) => item.label === 'skills.txt   /home/rafey').action()

    expect(open).toHaveBeenCalledWith('/home/rafey/skills.txt')
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
