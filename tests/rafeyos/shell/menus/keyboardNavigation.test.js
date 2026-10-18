// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { gridColumns, gridStep, menuStep, nearestInDirection } from '@/components/rafeyos/shell/menus/logic/keyboardNavigation'

describe('menuStep', () => {
  it('wraps around both ends', () => {
    expect(menuStep(0, 'ArrowDown', 3)).toBe(1)
    expect(menuStep(2, 'ArrowDown', 3)).toBe(0)
    expect(menuStep(0, 'ArrowUp', 3)).toBe(2)
  })

  it('starts at the top or bottom when nothing has focus', () => {
    expect(menuStep(-1, 'ArrowDown', 3)).toBe(0)
    expect(menuStep(-1, 'ArrowUp', 3)).toBe(2)
  })

  it('jumps with Home and End, and ignores other keys or an empty menu', () => {
    expect(menuStep(1, 'Home', 3)).toBe(0)
    expect(menuStep(1, 'End', 3)).toBe(2)
    expect(menuStep(1, 'a', 3)).toBeNull()
    expect(menuStep(0, 'ArrowDown', 0)).toBeNull()
  })
})

describe('gridStep', () => {
  const grid = { count: 7, columns: 3 }

  it('moves by one sideways and by a row up and down', () => {
    expect(gridStep(1, 'ArrowRight', grid)).toBe(2)
    expect(gridStep(1, 'ArrowLeft', grid)).toBe(0)
    expect(gridStep(1, 'ArrowDown', grid)).toBe(4)
    expect(gridStep(4, 'ArrowUp', grid)).toBe(1)
  })

  it('stays put at the edges', () => {
    expect(gridStep(0, 'ArrowLeft', grid)).toBe(0)
    expect(gridStep(5, 'ArrowDown', grid)).toBe(5)
    expect(gridStep(1, 'ArrowUp', grid)).toBe(1)
  })

  it('selects the first item when nothing is selected', () => {
    expect(gridStep(-1, 'ArrowDown', grid)).toBe(0)
  })

  it('jumps with Home and End, and ignores other keys or no items', () => {
    expect(gridStep(3, 'Home', grid)).toBe(0)
    expect(gridStep(3, 'End', grid)).toBe(6)
    expect(gridStep(3, 'Enter', grid)).toBeNull()
    expect(gridStep(0, 'ArrowDown', { count: 0, columns: 3 })).toBeNull()
  })
})

describe('nearestInDirection', () => {
  // Two columns of icons, filled top to bottom
  const points = [{ x: 0, y: 0 }, { x: 0, y: 90 }, { x: 90, y: 0 }, { x: 90, y: 90 }]

  it('picks the closest icon that way, preferring the one in line', () => {
    expect(nearestInDirection(points, 0, 'ArrowDown')).toBe(1)
    expect(nearestInDirection(points, 0, 'ArrowRight')).toBe(2)
    expect(nearestInDirection(points, 3, 'ArrowUp')).toBe(2)
    expect(nearestInDirection(points, 3, 'ArrowLeft')).toBe(1)
  })

  it('stays put when nothing lies that way', () => {
    expect(nearestInDirection(points, 0, 'ArrowUp')).toBe(0)
  })

  it('starts at the first icon, and ignores other keys or no icons', () => {
    expect(nearestInDirection(points, -1, 'ArrowDown')).toBe(0)
    expect(nearestInDirection(points, 0, 'Enter')).toBeNull()
    expect(nearestInDirection([], 0, 'ArrowDown')).toBeNull()
  })
})

describe('gridColumns', () => {
  it('counts the resolved column tracks', () => {
    const element = document.createElement('div')
    element.style.gridTemplateColumns = '92px 92px 92px'

    expect(gridColumns(element)).toBe(3)
  })

  it('falls back to one column without a resolved layout', () => {
    const element = document.createElement('div')
    element.style.gridTemplateColumns = 'repeat(auto-fill, 92px)'

    expect(gridColumns(element)).toBe(1)
    expect(gridColumns(document.createElement('div'))).toBe(1)
    expect(gridColumns(null)).toBe(1)
  })
})
