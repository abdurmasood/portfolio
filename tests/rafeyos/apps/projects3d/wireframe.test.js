import { describe, expect, it, vi } from 'vitest'
import {
  INITIAL_ANGLES,
  SHAPE_NAMES,
  dragAngles,
  drawWireframe,
  projectPoint,
  shapeSegments,
  wireViewport,
} from '@/components/rafeyos/apps/projects3d/wireframe'
import { PROJECT_SHAPES, shapeForIndex } from '@/components/rafeyos/vfs/content'

const length = ([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const radius = ([x, y, z]) => Math.hypot(x, y, z)
const VIEWPORT = { cx: 100, cy: 50, scale: 10 }

describe('wireframe shapes', () => {
  it('draws the five shapes the mockup has', () => {
    expect(SHAPE_NAMES).toEqual(['octa', 'torus', 'sphere', 'cylinder', 'knot'])
  })

  it('joins every octahedron vertex to the four that are not opposite it', () => {
    const segments = shapeSegments('octa')

    expect(segments).toHaveLength(12)
    segments.forEach((segment) => expect(length(segment)).toBeCloseTo(1.1 * Math.SQRT2))
  })

  it('builds the torus from 18 rings of 14 and 8 loops of 40', () => {
    expect(shapeSegments('torus')).toHaveLength(18 * 14 + 8 * 40)
  })

  it('keeps every sphere point on the unit sphere', () => {
    const segments = shapeSegments('sphere')

    expect(segments).toHaveLength(7 * 32 + 12 * 16)
    segments.flat().forEach((point) => expect(radius(point)).toBeCloseTo(1))
  })

  it('gives the cylinder two caps and fourteen sides', () => {
    const segments = shapeSegments('cylinder')
    const sides = segments.slice(64)

    expect(segments).toHaveLength(2 * 32 + 14)
    sides.forEach(([from, to]) => {
      expect(from[1]).toBe(-0.85)
      expect(to[1]).toBe(0.85)
    })
  })

  it('closes the knot into one loop', () => {
    const segments = shapeSegments('knot')

    expect(segments).toHaveLength(240)
    expect(segments[239][1]).toEqual(segments[0][0])
  })

  it('refuses shapes it cannot draw', () => {
    expect(() => shapeSegments('icosa')).toThrow('Unknown wireframe shape: icosa')
  })

  it('only ever receives drawable shapes: icosa and tetra fall back to octa', () => {
    PROJECT_SHAPES.forEach((_, index) => expect(SHAPE_NAMES).toContain(shapeForIndex(index)))
    expect(shapeForIndex(PROJECT_SHAPES.indexOf('icosa'))).toBe('octa')
    expect(shapeForIndex(PROJECT_SHAPES.indexOf('tetra'))).toBe('octa')
  })
})

describe('projection', () => {
  it('puts the origin at the viewport centre', () => {
    expect(projectPoint([0, 0, 0], { ax: 0.7, ay: 1.3 }, VIEWPORT)).toEqual([100, 50])
  })

  it('maps x right and y up with no rotation', () => {
    expect(projectPoint([1, 0, 0], { ax: 0, ay: 0 }, VIEWPORT)).toEqual([110, 50])
    expect(projectPoint([0, 1, 0], { ax: 0, ay: 0 }, VIEWPORT)).toEqual([100, 40])
  })

  it('turns about y: a quarter turn brings +z to the right', () => {
    const [x, y] = projectPoint([0, 0, 1], { ax: 0, ay: Math.PI / 2 }, VIEWPORT)

    expect(x).toBeCloseTo(110)
    expect(y).toBeCloseTo(50)
  })

  it('shrinks points further away (perspective)', () => {
    const near = projectPoint([1, 0, -1], { ax: 0, ay: 0 }, VIEWPORT)
    const far = projectPoint([1, 0, 1], { ax: 0, ay: 0 }, VIEWPORT)

    expect(near[0] - 100).toBeCloseTo(10 * (3.4 / 2.4))
    expect(far[0] - 100).toBeCloseTo(10 * (3.4 / 4.4))
  })

  it('centres the shape right of middle, clear of the card, scaled to the short side', () => {
    expect(wireViewport(1000, 500)).toEqual({ cx: 580, cy: 220, scale: 140 })
  })

  it('turns 1 radian per 140 dragged pixels', () => {
    const angles = dragAngles(INITIAL_ANGLES, { dx: 140, dy: -70 })

    expect(angles.ax).toBeCloseTo(-0.05)
    expect(angles.ay).toBeCloseTo(1)
  })
})

describe('drawWireframe', () => {
  it('clears, then strokes every segment in one path at the device pixel ratio', () => {
    const context = { clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() }

    drawWireframe(context, { segments: shapeSegments('octa'), angles: INITIAL_ANGLES, width: 200, height: 100, dpr: 2 })

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 200, 100)
    expect(context.lineWidth).toBe(2.4)
    expect(context.strokeStyle).toBe('#ececec')
    expect(context.moveTo).toHaveBeenCalledTimes(12)
    expect(context.lineTo).toHaveBeenCalledTimes(12)
    expect(context.stroke).toHaveBeenCalledTimes(1)
  })
})
