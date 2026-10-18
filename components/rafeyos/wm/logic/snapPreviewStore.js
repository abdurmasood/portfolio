// The snap mode the dragged window would take on release. A tiny external store, so only
// SnapPreview re-renders while dragging, and only when the mode changes.

/** @returns {{ get: () => string|null, set: (mode: string|null) => void, subscribe: (fn) => () => void }} */
export const createSnapPreviewStore = () => {
  let mode = null
  const listeners = new Set()
  return Object.freeze({
    get: () => mode,
    set: (nextMode) => {
      if (nextMode === mode) return
      mode = nextMode
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  })
}
