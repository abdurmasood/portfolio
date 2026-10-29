import { describe, expect, it } from 'vitest'
import { emptyState, floatbarText, listItems, locationLabel, pathSegments, typeLabel, windowTitle } from '@/components/rafeyos/apps/files/logic/filesView'
import { initialFilesState } from '@/components/rafeyos/apps/files/logic/filesReducer'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'

const at = (path, search = null) => ({ ...initialFilesState(path), search })

describe('files view', () => {
  it('labels places and folders', () => {
    expect(locationLabel(realVfs, 'recent')).toBe('Recent')
    expect(locationLabel(realVfs, 'trash')).toBe('Trash')
    expect(locationLabel(realVfs, '/home/visitor')).toBe('Home')
    expect(locationLabel(realVfs, '/')).toBe('/')
    expect(locationLabel(realVfs, '/home/rafey')).toBe('rafey')
    expect(windowTitle(realVfs, at('/home/rafey/blog'))).toBe('blog')
    expect(windowTitle(realVfs, at('/home/visitor', 'x'))).toBe('Search')
  })

  it('lists folder children, search results, and nothing for Recent and Starred', () => {
    expect(listItems(realVfs, at('/home/rafey/Music'))).toContain('/home/rafey/Music/story.txt')
    expect(listItems(realVfs, at('/home/visitor', 'story'))).toEqual(['/home/rafey/Music/story.txt'])
    expect(listItems(realVfs, at('recent'))).toEqual([])
    expect(listItems(realVfs, at('starred'))).toEqual([])
  })

  it('picks the empty state for where the window is', () => {
    expect(emptyState(at('/home/visitor', 'x')).title).toBe('No Results Found')
    expect(emptyState(at('trash')).title).toBe('Trash is Empty')
    expect(emptyState(at('starred')).body).toBe('Star files from their right-click menu.')
    expect(emptyState(at('recent')).title).toBe('No Recent Files')
    expect(emptyState(at('/home/rafey/blog')).title).toBe('Folder is Empty')
  })

  it('splits paths into pathbar segments', () => {
    expect(pathSegments('/home/visitor')).toEqual(['/home/visitor'])
    expect(pathSegments('/home/visitor/Desktop')).toEqual(['/home/visitor', '/home/visitor/Desktop'])
    expect(pathSegments('/home/rafey/projects')).toEqual(['/', '/home', '/home/rafey', '/home/rafey/projects'])
    expect(pathSegments('/home')).toEqual(['/', '/home'])
    expect(pathSegments('/')).toEqual(['/'])
  })

  it('describes the selection', () => {
    expect(floatbarText(realVfs, [])).toBeNull()
    expect(floatbarText(realVfs, ['/home/rafey/Music'])).toBe('“Music” selected (2 items)')
    expect(floatbarText(realVfs, ['/home/rafey/Music', '/home/rafey/blog'])).toBe('2 items selected')
    expect(floatbarText(realVfs, ['/home/rafey/missing.txt'])).toBeNull()
  })

  it('shortens type labels for the list view', () => {
    expect(typeLabel(realVfs, '/home/rafey/projects')).toBe('Folder')
    expect(typeLabel(realVfs, '/home/rafey/bio.txt')).toBe('Plain text')
  })
})
