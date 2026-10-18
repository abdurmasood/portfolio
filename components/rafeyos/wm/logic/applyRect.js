/** Writes a rect straight onto a window's style; used during gestures and after every commit. */
export const applyRect = (element, rect) => {
  element.style.left = `${rect.x}px`
  element.style.top = `${rect.y}px`
  element.style.width = `${rect.w}px`
  element.style.height = `${rect.h}px`
}

/** During a drag only the position changes, so leave the size alone. */
export const applyPosition = (element, rect) => {
  element.style.left = `${rect.x}px`
  element.style.top = `${rect.y}px`
}
