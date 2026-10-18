import { describe, it, expect } from 'vitest'
import { humanBytes } from '@/components/rafeyos/vfs/format'

describe('humanBytes', () => {
  it('uses bytes below 1000', () => {
    expect(humanBytes(0)).toBe('0 bytes')
    expect(humanBytes(999)).toBe('999 bytes')
  })

  it('uses decimal kB and MB like GNOME', () => {
    expect(humanBytes(1000)).toBe('1.0 kB')
    expect(humanBytes(1536)).toBe('1.5 kB')
    expect(humanBytes(5073188)).toBe('5.1 MB')
  })
})
