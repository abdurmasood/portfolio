// Everything rafeyOS needs from the outside world, injected so tests can pass fakes
import { localStorageOrNull, sessionStorageOrNull } from '../../../lib/browserStorage'
import { createDocumentsStore } from '../vfs/documents'
import { browserClipboard } from './clipboard'
import { createAudio } from './audio'
import { createMediaSession } from './mediaSession'
import { loadSamples } from '../../../lib/audioSamples'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

const matches = (win, query, fallback) => win?.matchMedia?.(query).matches ?? fallback

/**
 * @param {{ router: { push: (href: string) => void }, win?: Window }} deps
 * @returns {{ navigate, storage, documents, now, openExternal, clipboard, createAudio, loadAudioSamples, mediaSession, reducedMotion, prefersDark }}
 */
export const createServices = ({ router, win = globalThis.window }) =>
  Object.freeze({
    navigate: (href) => router.push(href),
    storage: sessionStorageOrNull(win),
    documents: createDocumentsStore(localStorageOrNull(win)),
    now: () => new Date(),
    openExternal: (href) => win?.open(href, '_blank', 'noopener,noreferrer'),
    clipboard: browserClipboard(win),
    // (src) => audio adapter; called on the first play, which is always a user gesture
    createAudio: (src) => createAudio(src, win?.Audio),
    // (src) => Promise<Float32Array>, decoded once per page load; the Music waveform
    loadAudioSamples: loadSamples,
    // null where the browser has no Media Session API
    mediaSession: createMediaSession(win),
    reducedMotion: () => matches(win, REDUCED_MOTION_QUERY, false),
    prefersDark: () => matches(win, DARK_SCHEME_QUERY, true),
  })
