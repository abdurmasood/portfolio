// Wireframe maths for the Projects app (mockup shapeSegs and its projection). Pure: points are
// [x, y, z] in model space, segments are [from, to] pairs, angles are radians.

const TAU = Math.PI * 2
// Camera distance in the perspective divide (mockup: 3.4)
const CAMERA_DISTANCE = 3.4
// Where the shape sits in the canvas: right of centre, clear of the bottom-left project card
const CENTRE_X = 0.58
const CENTRE_Y = 0.44
const SCALE = 0.28

export const INITIAL_ANGLES = Object.freeze({ ax: 0.45, ay: 0 })
// Auto-rotation per frame, and drag pixels per radian (mockup values)
export const SPIN_PER_FRAME = 0.005
export const DRAG_PIXELS_PER_RADIAN = 140

/** n segments along f(t) for t in [0, 1); closed loops join the last point back to the first. */
const sampled = (f, n, closed = true) =>
  Array.from({ length: n }, (_, k) => [f(k / n), closed ? f(((k + 1) % n) / n) : f((k + 1) / n)])

const OCTA_RADIUS = 1.1

/** Each vertex joins every vertex that isn't its opposite (vertices come in opposite pairs). */
const octa = () => {
  const r = OCTA_RADIUS
  const v = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]]
  const segments = []
  for (let a = 0; a < v.length; a += 1) {
    for (let b = a + 1; b < v.length; b += 1) if (a >> 1 !== b >> 1) segments.push([v[a], v[b]])
  }
  return segments
}

const torus = () => {
  const R = 0.8
  const r = 0.32
  const point = (u, v) => [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]
  const rings = Array.from({ length: 18 }, (_, a) => sampled((t) => point((a / 18) * TAU, t * TAU), 14))
  const loops = Array.from({ length: 8 }, (_, b) => sampled((t) => point(t * TAU, (b / 8) * TAU), 40))
  return [...rings, ...loops].flat()
}

const sphere = () => {
  const latitudes = Array.from({ length: 7 }, (_, i) => {
    const phi = ((i + 1) / 8) * Math.PI
    return sampled((t) => [Math.sin(phi) * Math.cos(t * TAU), Math.cos(phi), Math.sin(phi) * Math.sin(t * TAU)], 32)
  })
  const meridians = Array.from({ length: 12 }, (_, m) => {
    const theta = (m / 12) * TAU
    const f = (t) => [Math.sin(t * Math.PI) * Math.cos(theta), Math.cos(t * Math.PI), Math.sin(t * Math.PI) * Math.sin(theta)]
    return sampled(f, 16, false)
  })
  return [...latitudes, ...meridians].flat()
}

const cylinder = () => {
  const r = 0.7
  const h = 0.85
  const caps = [-h, h].map((y) => sampled((t) => [r * Math.cos(t * TAU), y, r * Math.sin(t * TAU)], 32))
  const sides = Array.from({ length: 14 }, (_, m) => {
    const theta = (m / 14) * TAU
    return [[r * Math.cos(theta), -h, r * Math.sin(theta)], [r * Math.cos(theta), h, r * Math.sin(theta)]]
  })
  return [...caps.flat(), ...sides]
}

/** A (2, 3) torus knot. */
const knot = () =>
  sampled((t) => {
    const u = t * TAU
    const r = 0.62 + 0.28 * Math.cos(3 * u)
    return [r * Math.cos(2 * u) * 1.15, 0.3 * Math.sin(3 * u) * 1.15, r * Math.sin(2 * u) * 1.15]
  }, 240)

const SHAPES = Object.freeze({ octa, torus, sphere, cylinder, knot })

export const SHAPE_NAMES = Object.freeze(Object.keys(SHAPES))

/**
 * @param {string} kind - one of SHAPE_NAMES (content.js maps the 3D page's icosa and tetra to octa)
 * @returns {Array<[number[], number[]]>} line segments
 */
export const shapeSegments = (kind) => {
  const build = SHAPES[kind]
  if (!build) throw new Error(`Unknown wireframe shape: ${kind}`)
  return build()
}

/**
 * Rotates about y (ay) then x (ax), then applies perspective.
 * @param {number[]} point - [x, y, z]
 * @param {{ ax: number, ay: number }} angles
 * @param {{ cx: number, cy: number, scale: number }} viewport - centre and pixels per unit
 * @returns {[number, number]} canvas x, y (y grows downwards)
 */
export const projectPoint = ([x, y, z], { ax, ay }, { cx, cy, scale }) => {
  const cosX = Math.cos(ax)
  const sinX = Math.sin(ax)
  const cosY = Math.cos(ay)
  const sinY = Math.sin(ay)
  const x1 = x * cosY + z * sinY
  const z1 = -x * sinY + z * cosY
  const y1 = y * cosX - z1 * sinX
  const z2 = y * sinX + z1 * cosX
  const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE + z2)
  return [cx + x1 * perspective * scale, cy - y1 * perspective * scale]
}

/** The viewport for a canvas of this size in device pixels. */
export const wireViewport = (width, height) => ({
  cx: width * CENTRE_X,
  cy: height * CENTRE_Y,
  scale: Math.min(width, height) * SCALE,
})

/** Angles after dragging by (dx, dy) pixels from where the drag started. */
export const dragAngles = (start, { dx, dy }) => ({
  ax: start.ax + dy / DRAG_PIXELS_PER_RADIAN,
  ay: start.ay + dx / DRAG_PIXELS_PER_RADIAN,
})

/**
 * Strokes every segment as one path.
 * @param {CanvasRenderingContext2D} context
 * @param {{ segments: Array, angles: object, width: number, height: number, dpr: number }} frame
 */
export const drawWireframe = (context, { segments, angles, width, height, dpr }) => {
  const viewport = wireViewport(width, height)
  context.clearRect(0, 0, width, height)
  context.strokeStyle = '#ececec'
  context.lineWidth = 1.2 * dpr
  context.beginPath()
  segments.forEach(([from, to]) => {
    const [x1, y1] = projectPoint(from, angles, viewport)
    const [x2, y2] = projectPoint(to, angles, viewport)
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
  })
  context.stroke()
}
