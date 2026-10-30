import { describe, expect, it, vi } from 'vitest'
import { SETTINGS_KEY, createSettingsStore, sharedSettingsStore } from '@/components/rafeyos/core/settings/settingsStore'
import { SAVED_KEYS } from '@/components/rafeyos/core/settings/settingsSchema'
import { memoryStorage, quotaError, refusingWrites } from '@/tests/rafeyos/helpers/renderRafeyOS'

const storeOn = (storage, win = new EventTarget()) => createSettingsStore({ storage, win })

const saved = (values, v = 1) => JSON.stringify({ v, values })

const onDisk = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY))

// memoryStorage isn't a real Storage, so StorageEvent's constructor won't take it as storageArea
const storageEvent = (key, storageArea) => Object.assign(new Event('storage'), { key, storageArea })

describe('settings store', () => {
  it('saves only the appearance keys', () => {
    expect(SAVED_KEYS).toEqual(['style', 'accent', 'wall', 'dockPos', 'iconSize', 'showHome', 'corner'])
  })

  it('keeps every appearance setting across a reload, as {v: 1, values}', () => {
    const disk = memoryStorage()
    const store = storeOn(disk)

    store.set('accent', '#0073E5')
    store.set('wall', 3)
    store.set('dockPos', 'right')
    store.set('iconSize', 56)
    store.set('showHome', false)
    store.set('corner', 'br')
    store.set('style', 'light')

    const values = { accent: '#0073E5', wall: 3, dockPos: 'right', iconSize: 56, showHome: false, corner: 'br', style: 'light' }
    expect(onDisk(disk)).toEqual({ v: 1, values })
    expect(storeOn(disk).getState()).toEqual(values)
  })

  it('refuses Wi-Fi, volume, Do Not Disturb, Night Light and Bluetooth, which reset on reload', () => {
    const store = storeOn(memoryStorage())

    for (const [key, value] of [['wifi', false], ['volume', 10], ['dnd', true], ['night', true], ['bt', true]]) {
      expect(() => store.set(key, value)).toThrow(`Not a saved setting: ${key}`)
    }
  })

  it('refuses values the desktop could not show', () => {
    const store = storeOn(memoryStorage())

    expect(() => store.set('accent', '#123456')).toThrow(RangeError)
    expect(() => store.set('iconSize', 30)).toThrow(RangeError)
    expect(() => store.set('showHome', 'yes')).toThrow(RangeError)
  })

  it('ignores bad saved values, keeping the good ones', () => {
    const disk = memoryStorage({
      [SETTINGS_KEY]: saved({ accent: '#123456', wall: 99, dockPos: 'top', iconSize: 30, style: 'blue', showHome: 'yes', corner: 'br', volume: 10 }),
    })

    expect(storeOn(disk).getState()).toEqual({ corner: 'br' })
    expect(storeOn(memoryStorage({ [SETTINGS_KEY]: '{oops' })).getState()).toEqual({})
    expect(storeOn(memoryStorage({ [SETTINGS_KEY]: saved(null) })).getState()).toEqual({})
    expect(storeOn(memoryStorage({ [SETTINGS_KEY]: '7' })).getState()).toEqual({})
    const unreadable = { getItem: () => { throw new Error('denied') }, setItem: vi.fn(), removeItem: vi.fn() }
    expect(storeOn(unreadable).getState()).toEqual({})
  })

  it('leaves a newer version on disk alone, applying changes this session only', () => {
    const newer = saved({ accent: '#0073E5' }, 2)
    const disk = memoryStorage({ [SETTINGS_KEY]: newer })
    const store = storeOn(disk)

    expect(store.getState()).toEqual({})
    expect(store.set('wall', 1)).toEqual({ ok: false, reason: 'blocked' })
    expect(store.getState()).toEqual({ wall: 1 })
    expect(disk.getItem(SETTINGS_KEY)).toBe(newer)
  })

  it('re-reads the disk before each write, so another tab’s change is kept', () => {
    const disk = memoryStorage()
    const store = storeOn(disk)
    storeOn(disk).set('accent', '#7764D8')

    store.set('wall', 2)

    expect(onDisk(disk).values).toEqual({ accent: '#7764D8', wall: 2 })
    expect(store.getState()).toEqual({ accent: '#7764D8', wall: 2 })
  })

  it('still applies the change this session when storage is full or blocked', () => {
    for (const [disk, reason] of [[refusingWrites(memoryStorage(), quotaError()), 'full'], [refusingWrites(memoryStorage(), new Error('denied')), 'blocked'], [null, 'blocked']]) {
      const store = storeOn(disk)
      const listener = vi.fn()
      store.subscribe(listener)

      expect(store.set('accent', '#0073E5')).toEqual({ ok: false, reason })
      expect(store.set('wall', 2)).toEqual({ ok: false, reason })

      expect(store.getState()).toEqual({ accent: '#0073E5', wall: 2 })
      expect(listener).toHaveBeenCalledTimes(2)
      // Nothing ever reached the disk, so forgetting the session's values needs no write
      expect(store.reset()).toEqual({ ok: true, state: {} })
      expect(store.getState()).toEqual({})
    }
  })

  it('saves what the session held once storage takes writes again', () => {
    const disk = memoryStorage()
    const setItem = disk.setItem
    disk.setItem = () => { throw quotaError() }
    const store = storeOn(disk)
    store.set('accent', '#0073E5')

    disk.setItem = setItem
    expect(store.set('wall', 2).ok).toBe(true)

    expect(onDisk(disk).values).toEqual({ accent: '#0073E5', wall: 2 })
  })

  it('returns the same state object when nothing changed', () => {
    const disk = memoryStorage()
    const store = storeOn(disk)
    const empty = store.getState()
    const listener = vi.fn()
    store.subscribe(listener)

    expect(store.reset()).toEqual({ ok: true, state: empty })
    expect(store.getState()).toBe(empty)
    const first = store.set('wall', 2).state
    expect(store.set('wall', 2).state).toBe(first)
    expect(store.getState()).toBe(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reset forgets every saved setting', () => {
    const disk = memoryStorage({ [SETTINGS_KEY]: saved({ accent: '#0073E5', style: 'light' }) })
    const store = storeOn(disk)

    expect(store.reset()).toEqual({ ok: true, state: {} })

    expect(storeOn(disk).getState()).toEqual({})
  })

  it('reset with a key forgets only that setting', () => {
    const disk = memoryStorage({ [SETTINGS_KEY]: saved({ accent: '#0073E5', style: 'light' }) })
    const store = storeOn(disk)
    const before = store.getState()

    expect(store.reset('wall')).toEqual({ ok: true, state: before })
    expect(store.reset('style')).toEqual({ ok: true, state: { accent: '#0073E5' } })

    expect(storeOn(disk).getState()).toEqual({ accent: '#0073E5' })
    expect(() => store.reset('wifi')).toThrow('Not a saved setting: wifi')
  })

  it('reset still forgets for this session when storage is full', () => {
    const disk = refusingWrites(memoryStorage({ [SETTINGS_KEY]: saved({ accent: '#0073E5' }) }), quotaError())
    const store = storeOn(disk)

    expect(store.reset()).toEqual({ ok: false, reason: 'full' })

    expect(store.getState()).toEqual({})
    expect(storeOn(disk).getState()).toEqual({ accent: '#0073E5' })
  })

  it('follows another tab’s change, and its clear(), on this storage only', () => {
    const disk = memoryStorage()
    const win = new EventTarget()
    const store = storeOn(disk, win)
    const listener = vi.fn()
    store.subscribe(listener)
    disk.setItem(SETTINGS_KEY, saved({ accent: '#DA3450' }))

    win.dispatchEvent(storageEvent('unrelated', disk))
    win.dispatchEvent(storageEvent(SETTINGS_KEY, memoryStorage()))
    expect(listener).not.toHaveBeenCalled()

    win.dispatchEvent(storageEvent(SETTINGS_KEY, disk))
    expect(store.getState()).toEqual({ accent: '#DA3450' })

    disk.removeItem(SETTINGS_KEY)
    win.dispatchEvent(storageEvent(null, disk))
    expect(store.getState()).toEqual({})
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('stops notifying a listener once it unsubscribes', () => {
    const store = storeOn(memoryStorage())
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    unsubscribe()
    store.set('wall', 1)

    expect(listener).not.toHaveBeenCalled()
  })

  it('is one store per window, and unshared without one', () => {
    const fakeWindow = () => ({ localStorage: memoryStorage(), addEventListener: vi.fn() })
    const win = fakeWindow()

    const store = sharedSettingsStore(win)

    expect(sharedSettingsStore(win)).toBe(store)
    expect(sharedSettingsStore(fakeWindow())).not.toBe(store)
    expect(win.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
    expect(store.set('wall', 1).ok).toBe(true)
    expect(win.localStorage.has(SETTINGS_KEY)).toBe(true)

    const unshared = sharedSettingsStore(undefined)
    expect(sharedSettingsStore(undefined)).not.toBe(unshared)
    expect(unshared.set('wall', 1)).toEqual({ ok: false, reason: 'blocked' })
  })
})
