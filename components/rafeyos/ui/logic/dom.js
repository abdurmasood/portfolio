// DOM measurement shared by menus, the dock, desktop icons and window animations.

/** An element's viewport box as a plain rect. */
export const rectOfElement = (element) => {
  const box = element.getBoundingClientRect()
  return { x: box.left, y: box.top, w: box.width, h: box.height }
}
