import { describe, expect, it } from 'vitest'
import { emptyState, floatbarText, isShowable, listItems, locationLabel, nearestFolder, pathSegments, typeLabel, windowTitle } from '@/components/rafeyos/apps/files/logic/filesView'
import { initialFilesState } from '@/components/rafeyos/apps/files/logic/filesReducer'
import { dirNode, mergeState, seedState, textNode, withNodes } from '@/components/rafeyos/core/vfs/fsState'
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

  it('files and desktop hide dotfiles', () => {
    const seed = seedState(0)
    const vfs = mergeState(realVfs, withNodes(seed, {
      ...seed.nodes,
      '/home/visitor/.profile': textNode('x\n', 0),
      '/home/visitor/.config': dirNode(0),
      '/home/visitor/.config/settings.txt': textNode('x\n', 0),
      '/home/visitor/story.txt': textNode('x\n', 0),
    }))

    expect(listItems(vfs, at('/home/visitor'))).toEqual([
      '/home/visitor/Desktop', '/home/visitor/Documents', '/home/visitor/Downloads', '/home/visitor/story.txt',
    ])
    // Inside a hidden folder its ordinary files still show, as Nautilus does once you are there
    expect(listItems(vfs, at('/home/visitor/.config'))).toEqual(['/home/visitor/.config/settings.txt'])
    expect(listItems(vfs, at('/home/visitor', 'settings'))).toEqual([])
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

  it('knows which places a window can still show, and the nearest folder above one that went', () => {
    const vfs = mergeState(realVfs, seedState(0))

    expect(['recent', 'starred', 'trash', '/home/visitor/Documents'].every((path) => isShowable(vfs, path))).toBe(true)
    expect(isShowable(vfs, '/home/visitor/Documents/notes')).toBe(false)
    expect(nearestFolder(vfs, '/home/visitor/Documents/notes/deeper')).toBe('/home/visitor/Documents')
    expect(nearestFolder(realVfs, '/home/visitor/Documents')).toBe('/home/visitor')
    expect(nearestFolder(vfs, '/home/visitor/Desktop')).toBe('/home/visitor/Desktop')
  })
})
