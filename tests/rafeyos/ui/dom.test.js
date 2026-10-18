import { describe, expect, it } from 'vitest'
import { rectOfElement } from '@/components/rafeyos/ui/logic/dom'

describe('dom', () => {
  it('reads element rects as x/y/w/h', () => {
    const element = { getBoundingClientRect: () => ({ left: 1, top: 2, width: 3, height: 4 }) }

    expect(rectOfElement(element)).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })
})
