// Web Animations for windows. Every function is a no-op (and finishes at once) when motion
// is reduced or the element can't animate (jsdom), so callers never wait on a missing animation.

const MINIMIZE_SCALE = 0.08
const FALLBACK_TARGET_SIZE = 48
const OPEN_EASING = 'cubic-bezier(.2,.8,.25,1)'

const canAnimate = (element, reduced) => !reduced && typeof element?.animate === 'function'

/** Where a window shrinks to: the centre of its dock button, scaled down. */
export const minimizeTransform = (rect, target) => {
  const dx = target.x + target.w / 2 - (MINIMIZE_SCALE * rect.w) / 2 - rect.x
  const dy = target.y + target.h / 2 - (MINIMIZE_SCALE * rect.h) / 2 - rect.y
  return `translate(${dx}px, ${dy}px) scale(${MINIMIZE_SCALE})`
}

export const fallbackTarget = (viewportHeight) => ({
  x: 0,
  y: viewportHeight / 2,
  w: FALLBACK_TARGET_SIZE,
  h: FALLBACK_TARGET_SIZE,
})

const run = (element, keyframes, options, onDone) => {
  const animation = element.animate(keyframes, options)
  if (onDone) animation.onfinish = onDone
  return animation
}

/** Grows from the launcher (dock button or icon rect), or pops in place without one. */
export const animateOpen = (element, { rect, from, reduced }) => {
  if (!canAnimate(element, reduced)) return null
  element.style.transformOrigin = from
    ? `${from.x + from.w / 2 - rect.x}px ${from.y + from.h / 2 - rect.y}px`
    : '50% 50%'
  const start = from ? 'scale(.3)' : 'scale(.92)'
  return run(element, [{ transform: start, opacity: 0 }, { transform: 'none', opacity: 1 }], {
    duration: from ? 240 : 170,
    easing: OPEN_EASING,
  })
}

export const animateMinimize = (element, { transform, reduced }, onDone) => {
  if (!canAnimate(element, reduced)) return onDone()
  element.style.transformOrigin = '0 0'
  return run(element, [{ transform: 'none', opacity: 1 }, { transform, opacity: 0 }], {
    duration: 260,
    easing: 'cubic-bezier(.45,0,.7,1)',
  }, onDone)
}

export const animateRestore = (element, { transform, reduced }) => {
  if (!canAnimate(element, reduced) || !transform) return null
  element.style.transformOrigin = '0 0'
  return run(element, [{ transform, opacity: 0 }, { transform: 'none', opacity: 1 }], {
    duration: 260,
    easing: 'cubic-bezier(.2,.8,.3,1)',
  })
}

export const animateClose = (element, { reduced }, onDone) => {
  if (!canAnimate(element, reduced)) return onDone()
  element.style.transformOrigin = '50% 50%'
  return run(element, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], {
    duration: 140,
    easing: 'ease-in',
    // Hold the faded frame. The default fill drops it, so the window pops back to full size before removal.
    fill: 'forwards',
  }, onDone)
}
