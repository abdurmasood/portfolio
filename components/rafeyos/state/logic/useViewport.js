import { useEffect, useState } from 'react'

// Matches the mockup: windows relayout once the resize settles
export const RESIZE_DEBOUNCE_MS = 80

const readViewport = () => ({ w: window.innerWidth, h: window.innerHeight })

const keepIfSame = (next) => (prev) => (prev.w === next.w && prev.h === next.h ? prev : next)

/** The window's inner size, updated after resizing settles. */
export const useViewport = () => {
  const [viewport, setViewport] = useState(readViewport)
  useEffect(() => {
    let timer = null
    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setViewport(keepIfSame(readViewport())), RESIZE_DEBOUNCE_MS)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return viewport
}
