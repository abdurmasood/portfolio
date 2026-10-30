import { describe, it, expect } from 'vitest'
import { byteCount, bytesOf, characterCount, textOf } from '@/components/rafeyos/core/vfs/bytes'

const CUT_E = '\uDCC3'

describe('bytes', () => {
  it('reads whole characters as text, a leading byte-order mark included', () => {
    expect(textOf(Uint8Array.of(0x61, 0xc3, 0xa9))).toBe('aé')
    expect(textOf(Uint8Array.of(0xef, 0xbb, 0xbf, 0x61))).toBe('﻿a')
    expect(byteCount('﻿a')).toBe(4)
  })

  it('keeps each byte that starts no whole character as one escaped byte', () => {
    expect(textOf(Uint8Array.of(0xc3))).toBe(CUT_E)
    expect(textOf(Uint8Array.of(0x61, 0xa9, 0x62))).toBe('a\uDCA9b')
    expect(textOf(Uint8Array.of(0xe0, 0x80, 0x80))).toBe('\uDCE0\uDC80\uDC80')
    expect(textOf(Uint8Array.of(0xf0, 0x9f, 0x98))).toBe('\uDCF0\uDC9F\uDC98')
    expect(textOf(Uint8Array.of(0xff, 0x61))).toBe('\uDCFFa')
  })

  it('writes an escaped byte back as that byte, joining pieces of one character', () => {
    expect([...bytesOf(`${CUT_E}\uDCA9`)]).toEqual([0xc3, 0xa9])
    expect(textOf(bytesOf(`x${CUT_E}\uDCA9y`))).toBe('xéy')
    expect(byteCount(`${CUT_E}\n`)).toBe(2)
  })

  it('leaves a real character outside the basic plane whole', () => {
    expect(byteCount('😀')).toBe(4)
    expect(textOf(bytesOf('😀'))).toBe('😀')
    expect(characterCount('😀')).toBe(1)
  })

  it('counts characters without the bytes that are not part of one', () => {
    expect(characterCount(`a${CUT_E}é`)).toBe(2)
  })
})
