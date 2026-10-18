import { describe, expect, it } from 'vitest'
import { handlerFor, isAudio, isImplemented, isWebLink, unavailableNote } from '@/components/rafeyos/core/catalog/apps'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'

describe('app availability', () => {
  it('knows which apps have a UI in this phase', () => {
    expect(isImplemented('files')).toBe(true)
    expect(isImplemented('terminal')).toBe(true)
    expect(isImplemented('editor')).toBe(true)
    expect(isImplemented('mail')).toBe(true)
    expect(isImplemented('properties')).toBe(true)
    expect(isImplemented('music')).toBe(true)
    expect(isImplemented('settings')).toBe(true)
    expect(isImplemented('projects')).toBe(true)
    expect(isImplemented('nope')).toBe(false)
  })

  it('recognises web links, which open through a dialog', () => {
    expect(isWebLink(realVfs, '~/contact/linkedin.desktop')).toBe(true)
    expect(isWebLink(realVfs, '~/contact/email.desktop')).toBe(false)
    expect(isWebLink(realVfs, '~/nope')).toBe(false)
  })

  it('recognises audio files, which play as they open', () => {
    expect(isAudio(realVfs, '~/Music/storms-ahead.mp3')).toBe(true)
    expect(isAudio(realVfs, '~/Music/story.txt')).toBe(false)
    expect(isAudio(realVfs, '~/nope')).toBe(false)
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
