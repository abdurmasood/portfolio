// Sizes come from the scene's container, not the viewport, so the same scene fits the
// full /projects page and a rafeyOS window.
export const COMPACT_MAX_WIDTH = 640

export const isCompactWidth = (width) => width > 0 && width <= COMPACT_MAX_WIDTH

// Narrower containers pull the camera back so the ring of shapes still fits
export const cameraDistanceFor = (width) => {
  if (width <= 480) return 36
  if (width <= 768) return 28
  if (width <= 1024) return 25
  return 20
}
