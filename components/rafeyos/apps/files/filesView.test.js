import { describe, expect, it } from 'vitest'
import { emptyState, floatbarText, listItems, locationLabel, pathSegments, typeLabel, windowTitle } from './filesView'
import { initialFilesState } from './filesReducer'
import { realVfs } from '../../vfs/testVfs'

const at = (path, search = null) => ({ ...initialFilesState(path), search })

describe('files view', () => {
  it('labels places and folders', () => {
    expect(locationLabel(realVfs, 'recent')).toBe('Recent')
    expect(locationLabel(realVfs, 'trash')).toBe('Trash')
    expect(locationLabel(realVfs, '~')).toBe('Home')
    expect(windowTitle(realVfs, at('~/blog'))).toBe('blog')
    expect(windowTitle(realVfs, at('~', 'x'))).toBe('Search')
  })

  it('lists folder children, search results, and nothing for Recent and Starred', () => {
    expect(listItems(realVfs, at('~/Music'))).toContain('~/Music/story.txt')
    expect(listItems(realVfs, at('~', 'story'))).toEqual(['~/Music/story.txt'])
    expect(listItems(realVfs, at('recent'))).toEqual([])
    expect(listItems(realVfs, at('starred'))).toEqual([])
  })

  it('picks the empty state for where the window is', () => {
    expect(emptyState(at('~', 'x')).title).toBe('No Results Found')
    expect(emptyState(at('trash')).title).toBe('Trash is Empty')
    expect(emptyState(at('starred')).body).toBe('Star files from their right-click menu.')
    expect(emptyState(at('recent')).title).toBe('No Recent Files')
    expect(emptyState(at('~/blog')).title).toBe('Folder is Empty')
  })

  it('splits paths into pathbar segments', () => {
    expect(pathSegments('~')).toEqual(['~'])
    expect(pathSegments('~/Music')).toEqual(['~', '~/Music'])
  })

  it('describes the selection', () => {
    expect(floatbarText(realVfs, [])).toBeNull()
    expect(floatbarText(realVfs, ['~/Music'])).toBe('“Music” selected (2 items)')
    expect(floatbarText(realVfs, ['~/Music', '~/blog'])).toBe('2 items selected')
  })

  it('shortens type labels for the list view', () => {
    expect(typeLabel(realVfs, '~/projects')).toBe('Folder')
    expect(typeLabel(realVfs, '~/bio.txt')).toBe('Plain text')
    expect(typeLabel(realVfs, '~/Desktop/projects')).toBe('Folder')
  })
})
