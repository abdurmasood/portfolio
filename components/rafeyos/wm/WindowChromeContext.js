import { createContext, useContext } from 'react'

/** Header-bar behaviour for the window an app is rendered in: drag, max toggle, min, close. */
export const WindowChromeContext = createContext(null)
WindowChromeContext.displayName = 'WindowChrome'

export const useWindowChrome = () => {
  const chrome = useContext(WindowChromeContext)
  if (!chrome) throw new Error('Header bars must render inside a Window')
  return chrome
}
