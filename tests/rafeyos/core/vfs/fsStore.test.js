import { describe, expect, it, vi } from 'vitest'
import { FS_KEY, LEGACY_KEY, createFsStore, sharedFsStore } from '@/components/rafeyos/core/vfs/fsStore'
import { seedState, serializeState } from '@/components/rafeyos/core/vfs/fsState'
import { memoryStorage } from '@/tests/rafeyos/helpers/renderRafeyOS'

const NOW = 5
const DESKTOP = '/home/visitor/Desktop'
const OLD_FILE = '/home/visitor/Documents/old.txt'

const storeOn = (storage, win = new EventTarget()) => createFsStore({ storage, win, now: () => NOW })

const onDisk = (storage) => JSON.parse(storage.getItem(FS_KEY))

const legacyValue = (files, trash = {}) => JSON.stringify({ files, trash })

// memoryStorage isn't a real Storage, so StorageEvent's constructor won't take it as storageArea
const storageEvent = (key, storageArea) => Object.assign(new Event('storage'), { key, storageArea })

const text = (value) => ({ type: 'text', text: value, mtime: NOW })

/** A storage whose next `times` writes throw `error`; later writes go through. */
const failingWrites = (error, times = Infinity, entries = {}) => {
  const storage = memoryStorage(entries)
  const write = storage.setItem
  let left = times
  storage.setItem = vi.fn((key, value) => {
    if (left-- > 0) throw error
    write(key, value)
  })
  return storage
}

describe('createFsStore loading', () => {
  it('first load seeds without writing', () => {
    const storage = memoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')

    const store = storeOn(storage)

    expect(store.getState()).toEqual(seedState(NOW))
    expect(setItem).not.toHaveBeenCalled()
    expect(Object.isFrozen(store)).toBe(true)
  })

  it('migrated legacy files are visible before any write', () => {
    const legacy = legacyValue({ '~/Documents/old.txt': 'x' }, { '~/Desktop/gone.txt': 'y' })
    const storage = memoryStorage({ [LEGACY_KEY]: legacy })

    const state = storeOn(storage).getState()

    expect(state.nodes[OLD_FILE]).toEqual(text('x'))
    expect(state.trash['/home/visitor/Desktop/gone.txt']).toEqual({ text: 'y', mtime: NOW })
    expect(storage.has(FS_KEY)).toBe(false)
    expect(storage.getItem(LEGACY_KEY)).toBe(legacy)
  })

  it('reads a stored state and ignores junk in either key', () => {
    const saved = serializeState({ v: 1, nodes: { ...seedState(1).nodes, [`${DESKTOP}/a.txt`]: text('a') }, trash: {} })
    expect(storeOn(memoryStorage({ [FS_KEY]: saved })).getState().nodes[`${DESKTOP}/a.txt`]).toEqual(text('a'))
    expect(storeOn(memoryStorage({ [FS_KEY]: '{oops', [LEGACY_KEY]: '{oops' })).getState()).toEqual(seedState(NOW))
  })

  it('loads as seeded when reading storage throws', () => {
    const storage = { getItem: () => { throw new Error('denied') }, setItem: vi.fn(), removeItem: vi.fn() }
    expect(storeOn(storage).getState()).toEqual(seedState(NOW))
  })
})

describe('createFsStore writes', () => {
  it('first successful write persists migration and removes legacy key', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: legacyValue({ '~/Documents/old.txt': 'x' }) })
    const store = storeOn(storage)

    const result = store.saveFile(DESKTOP, 'a', 'hello')

    expect(result).toMatchObject({ ok: true, path: `${DESKTOP}/a.txt`, name: 'a.txt' })
    expect(onDisk(storage).nodes).toMatchObject({ [OLD_FILE]: text('x'), [`${DESKTOP}/a.txt`]: text('hello') })
    expect(storage.has(LEGACY_KEY)).toBe(false)
    expect(store.getState()).toEqual(onDisk(storage))
  })

  it('first successful write clears a legacy key that is not JSON', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: '{oops' })
    const store = storeOn(storage)

    expect(store.getState()).toEqual(seedState(NOW))
    expect(store.saveFile(DESKTOP, 'a', 'hello').ok).toBe(true)
    expect(storage.has(LEGACY_KEY)).toBe(false)
  })

  it('save after failed migration still carries legacy files', () => {
    const quota = new DOMException('', 'QuotaExceededError')
    const storage = failingWrites(quota, 1, { [LEGACY_KEY]: legacyValue({ '~/Documents/old.txt': 'x' }) })
    const store = storeOn(storage)

    expect(store.saveFile(DESKTOP, 'a.txt', 'one')).toEqual({ ok: false, reason: 'full' })
    expect(storage.has(FS_KEY)).toBe(false)
    expect(storage.has(LEGACY_KEY)).toBe(true)

    expect(store.saveFile(DESKTOP, 'a.txt', 'two').ok).toBe(true)
    expect(onDisk(storage).nodes).toMatchObject({ [OLD_FILE]: text('x'), [`${DESKTOP}/a.txt`]: text('two') })
    expect(storage.has(LEGACY_KEY)).toBe(false)
  })

  it('unknown version is never overwritten', () => {
    const future = JSON.stringify({ v: 2, tree: {} })
    const legacy = legacyValue({ '~/Documents/old.txt': 'x' })
    const storage = memoryStorage({ [FS_KEY]: future, [LEGACY_KEY]: legacy })
    const store = storeOn(storage)
    const blocked = { ok: false, reason: 'blocked' }

    expect(store.getState()).toEqual(seedState(NOW))
    expect(store.saveFile(DESKTOP, 'a.txt', 'a')).toEqual(blocked)
    expect(store.moveToTrash(OLD_FILE)).toEqual(blocked)
    expect(store.restoreFromTrash(OLD_FILE)).toEqual(blocked)
    expect(store.emptyTrash()).toEqual(blocked)
    expect(storage.getItem(FS_KEY)).toBe(future)
    expect(storage.getItem(LEGACY_KEY)).toBe(legacy)
  })

  it('legacy write after migration is merged', () => {
    const storage = memoryStorage()
    const win = new EventTarget()
    const store = storeOn(storage, win)
    store.saveFile(DESKTOP, 'a.txt', 'a')

    // A tab still on the old bundle saves under the old key
    storage.setItem(LEGACY_KEY, legacyValue({ '~/Documents/late.txt': 'z' }))
    win.dispatchEvent(storageEvent(LEGACY_KEY, storage))

    expect(store.getState().nodes['/home/visitor/Documents/late.txt']).toEqual(text('z'))
    expect(store.saveFile(DESKTOP, 'b.txt', 'b').ok).toBe(true)
    expect(Object.keys(onDisk(storage).nodes)).toEqual(expect.arrayContaining([
      `${DESKTOP}/a.txt`, `${DESKTOP}/b.txt`, '/home/visitor/Documents/late.txt',
    ]))
    expect(storage.has(LEGACY_KEY)).toBe(false)
  })

  it.each([
    ['a QuotaExceededError', new DOMException('', 'QuotaExceededError')],
    ['code 22', Object.assign(new Error('quota'), { code: 22 })],
    ['code 1014', Object.assign(new Error('quota'), { code: 1014 })],
  ])('quota error reports full and keeps state (%s)', (_label, error) => {
    const saved = serializeState(seedState(1))
    const storage = failingWrites(error, Infinity, { [FS_KEY]: saved })
    const store = storeOn(storage)
    const before = store.getState()
    const listener = vi.fn()
    store.subscribe(listener)

    expect(store.saveFile(DESKTOP, 'a.txt', 'a')).toEqual({ ok: false, reason: 'full' })
    expect(store.getState()).toBe(before)
    expect(storage.getItem(FS_KEY)).toBe(saved)
    expect(listener).not.toHaveBeenCalled()
  })

  it('blocked storage reports blocked', () => {
    const blocked = { ok: false, reason: 'blocked' }
    const missing = storeOn(null)
    expect(missing.getState()).toEqual(seedState(NOW))
    expect(missing.saveFile(DESKTOP, 'a.txt', 'a')).toEqual(blocked)

    const refusing = storeOn(failingWrites(new DOMException('', 'SecurityError')))
    const before = refusing.getState()
    expect(refusing.saveFile(DESKTOP, 'a.txt', 'a')).toEqual(blocked)
    expect(refusing.getState()).toBe(before)
  })

  it('a refused mutation writes nothing', () => {
    const storage = memoryStorage()
    const store = storeOn(storage)

    expect(store.saveFile('/home/rafey', 'a.txt', 'a')).toEqual({ ok: false, reason: 'invalid' })
    expect(store.emptyTrash()).toEqual({ ok: false, reason: 'empty' })
    expect(storage.has(FS_KEY)).toBe(false)
  })

  it('trash, restore and empty write through to storage', () => {
    const storage = memoryStorage()
    const store = storeOn(storage)
    const path = `${DESKTOP}/a.txt`
    store.saveFile(DESKTOP, 'a.txt', 'a')

    expect(store.moveToTrash(path).ok).toBe(true)
    expect(onDisk(storage).trash).toEqual({ [path]: { text: 'a', mtime: NOW } })
    expect(store.restoreFromTrash(path).ok).toBe(true)
    expect(onDisk(storage).nodes[path]).toEqual(text('a'))
    store.moveToTrash(path)
    expect(store.emptyTrash().ok).toBe(true)
    expect(onDisk(storage).trash).toEqual({})
    expect(store.getState().nodes[path]).toBeUndefined()
  })

  it('second tab write is not clobbered', () => {
    const storage = memoryStorage()
    const tabA = storeOn(storage)
    const tabB = storeOn(storage)

    // No storage event reaches tab B in between: its write re-reads the disk first
    tabA.saveFile(DESKTOP, 'a.txt', 'a')
    tabB.saveFile(DESKTOP, 'b.txt', 'b')

    expect(onDisk(storage).nodes).toMatchObject({ [`${DESKTOP}/a.txt`]: text('a'), [`${DESKTOP}/b.txt`]: text('b') })
  })
})

describe('createFsStore cross-tab and snapshots', () => {
  it('storage event reloads and notifies', () => {
    const storage = memoryStorage()
    const win = new EventTarget()
    const tabA = storeOn(storage)
    const tabB = storeOn(storage, win)
    const listener = vi.fn()
    tabB.subscribe(listener)
    tabA.saveFile(DESKTOP, 'a.txt', 'a')

    win.dispatchEvent(storageEvent('unrelated', storage))
    win.dispatchEvent(storageEvent(FS_KEY, memoryStorage()))
    expect(listener).not.toHaveBeenCalled()

    win.dispatchEvent(storageEvent(FS_KEY, storage))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(tabB.getState().nodes[`${DESKTOP}/a.txt`]).toEqual(text('a'))

    // localStorage.clear() in another tab arrives with a null key
    win.dispatchEvent(storageEvent(null, storage))
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('snapshot identity is stable without changes', () => {
    const store = storeOn(memoryStorage())
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const first = store.getState()

    expect(store.getState()).toBe(first)
    store.saveFile(DESKTOP, '', 'a')
    expect(store.getState()).toBe(first)

    store.saveFile(DESKTOP, 'a.txt', 'a')
    expect(store.getState()).not.toBe(first)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.saveFile(DESKTOP, 'b.txt', 'b')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('shared store is one per window and unshared without window', () => {
    const fakeWindow = () => ({ localStorage: memoryStorage(), addEventListener: vi.fn() })
    const win = fakeWindow()

    const store = sharedFsStore(win)

    expect(sharedFsStore(win)).toBe(store)
    expect(sharedFsStore(fakeWindow())).not.toBe(store)
    expect(win.addEventListener).toHaveBeenCalledTimes(1)
    expect(win.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
    expect(store.saveFile(DESKTOP, 'a.txt', 'a').ok).toBe(true)
    expect(win.localStorage.has(FS_KEY)).toBe(true)

    const unshared = sharedFsStore(undefined)
    expect(sharedFsStore(undefined)).not.toBe(unshared)
    expect(unshared.saveFile(DESKTOP, 'a.txt', 'a')).toEqual({ ok: false, reason: 'blocked' })
  })
})
