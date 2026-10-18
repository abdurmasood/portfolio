import { describe, it, expect } from 'vitest'
import { WALLS } from '@/components/rafeyos/theme/walls'
import { ACCENTS } from '@/components/rafeyos/theme/accents'

describe('theme data', () => {
  it('has the four mockup wallpapers, frozen', () => {
    expect(WALLS.map((w) => w.name)).toEqual(['Dusk', 'Aubergine', 'Ember', 'Graphite'])
    expect(WALLS.every((w) => w.css.includes('gradient'))).toBe(true)
    expect(Object.isFrozen(WALLS)).toBe(true)
    expect(Object.isFrozen(WALLS[0])).toBe(true)
  })

  it('has the ten Ubuntu accents with Orange first, frozen', () => {
    expect(ACCENTS).toHaveLength(10)
    expect(ACCENTS[0]).toEqual({ name: 'Orange', hex: '#E95420' })
    expect(ACCENTS.every((a) => /^#[0-9A-F]{6}$/.test(a.hex))).toBe(true)
    expect(Object.isFrozen(ACCENTS)).toBe(true)
    expect(Object.isFrozen(ACCENTS[0])).toBe(true)
  })
})
