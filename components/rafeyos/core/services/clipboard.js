// Copying is best effort: the Clipboard API may be missing, throw (insecure context) or reject
// (permission denied). None of that should reach the visitor, who is shown the address anyway.

/** @returns {{ writeText: (text: string) => Promise<void> }} */
export const browserClipboard = (win = globalThis.window) => ({
  writeText: async (text) => {
    await win?.navigator?.clipboard?.writeText?.(text)
  },
})

/** Copies text and swallows any failure, sync or async. */
export const copyQuietly = (clipboard, text) => {
  try {
    return Promise.resolve(clipboard?.writeText(text)).catch(() => undefined)
  } catch {
    return Promise.resolve(undefined)
  }
}
