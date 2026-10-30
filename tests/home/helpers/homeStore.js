// Test helpers for the homepage terminal, which runs on the window's shared store (the one /os uses)
import { act } from '@testing-library/react'
import { FS_KEY, createFsStore, sharedFsStore } from '@/components/rafeyos/core/vfs/fsStore'
import { mergeState, seedState, serializeState } from '@/components/rafeyos/core/vfs/fsState'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { SETTINGS_KEY } from '@/components/rafeyos/core/settings/settingsStore'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'

/** Tells this tab's stores that another tab wrote `key`, as the browser does. */
export const announceWrite = (key = FS_KEY) =>
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: window.localStorage }))
  })

/**
 * A first visit's disk. The window's stores (files and settings) live as long as the window, so each test puts a fresh
 * disk under them and tells them to re-read.
 */
export const resetSharedStore = () => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.localStorage.setItem(FS_KEY, serializeState(seedState(0)))
  announceWrite()
  announceWrite(SETTINGS_KEY)
}

/** The tree the window's store (shared with /os) holds now. */
export const sharedVfs = () => mergeState(realVfs, sharedFsStore(window).getState())

/** The shell of a second tab on this browser's localStorage, for writes the homepage didn't make. */
export const otherTab = () =>
  createShellFs({ base: realVfs, store: createFsStore({ storage: window.localStorage, now: Date.now }) })
