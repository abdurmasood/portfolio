import { describe, expect, it } from 'vitest'
import { handlerFor, isImplemented, unavailableNote } from './availability'

describe('app availability', () => {
  it('knows which apps have a UI in this phase', () => {
    expect(isImplemented('files')).toBe(true)
    expect(isImplemented('terminal')).toBe(true)
    expect(isImplemented('editor')).toBe(false)
  })

  it('maps file types to the app that would open them', () => {
    expect(handlerFor({ type: 'dir' })).toBe('files')
    expect(handlerFor({ type: 'text' })).toBe('editor')
    expect(handlerFor({ type: 'audio' })).toBe('music')
    expect(handlerFor({ type: 'mailto' })).toBe('mail')
    expect(handlerFor({ type: 'weblink' })).toBeNull()
  })

  it('names the missing app in the note', () => {
    expect(unavailableNote('projects')).toBe("Projects isn't available yet")
    expect(unavailableNote(null)).toBe("Opening links isn't available yet")
    expect(unavailableNote('nope')).toBe("nope isn't available yet")
  })
})
