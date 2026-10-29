import { describe, it, expect } from 'vitest'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { mkdir, writeFile } from '@/components/rafeyos/core/vfs/fsOps'
import { fsFiles, fsStoreOn, memoryStorage, quotaError, refusingWrites } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'

const shellOn = (disk = memoryStorage()) => ({ disk, fs: createShellFs({ base: realVfs, store: fsStoreOn(disk) }) })

describe('createShellFs', () => {
  it('reads the shipped tree with the visitor\'s files laid over it', () => {
    const { fs } = shellOn()

    expect(fs.vfs()['/home/rafey/bio.txt'].type).toBe('text')
    expect(fs.vfs()['/home/visitor/Documents'].type).toBe('dir')
  })

  it('keeps the same tree until the store changes', () => {
    const { fs } = shellOn()
    const first = fs.vfs()

    expect(fs.vfs()).toBe(first)
    fs.apply(mkdir, { path: '/home/visitor/notes' })
    expect(fs.vfs()).not.toBe(first)
    expect(fs.vfs()['/home/visitor/notes'].type).toBe('dir')
  })

  it('apply persists an op and returns its result', () => {
    const { fs, disk } = shellOn()

    expect(fs.apply(writeFile, { path: '/home/visitor/a.txt', text: 'hi\n' }).ok).toBe(true)
    expect(fsFiles(disk)['/home/visitor/a.txt']).toBe('hi\n')
  })

  it('apply passes on errno and storage failures', () => {
    expect(shellOn().fs.apply(mkdir, { path: '/etc/x' })).toEqual({ ok: false, errno: 'EACCES', path: '/etc/x' })
    expect(shellOn(refusingWrites(memoryStorage(), quotaError())).fs.apply(mkdir, { path: '/home/visitor/x' })).toEqual({ ok: false, reason: 'full' })
  })

  it('check answers as apply would without writing anything', () => {
    const { fs, disk } = shellOn()

    expect(fs.check(writeFile, { path: '/home/visitor/a.txt', append: true })).toEqual({ ok: true })
    expect(fs.check(writeFile, { path: '/etc/a', append: true })).toEqual({ ok: false, errno: 'EACCES', path: '/etc/a' })
    expect(fs.vfs()['/home/visitor/a.txt']).toBeUndefined()
    expect(disk.has('rafeyos-fs')).toBe(false)
  })
})
