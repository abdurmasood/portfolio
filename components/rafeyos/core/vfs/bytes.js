// @ts-check
// A file's text as the UTF-8 bytes it holds. A byte that is not part of a whole character (what `head -c 1` leaves of
// `é`) is kept as the lone surrogate U+DC80 to U+DCFF, as Python's surrogateescape keeps it, so it still counts and
// cuts as the one byte it was.

const ESCAPE_BASE = 0xdc00
// With the u flag a character class matches only a surrogate with no partner, never half of a real character
const ESCAPED = /[\uDC80-\uDCFF]/gu
const UTF8_LENGTH = Object.freeze([
  { below: 0x80, length: 1 },
  { below: 0xc2, length: 0 },
  { below: 0xe0, length: 2 },
  { below: 0xf0, length: 3 },
  { below: 0xf5, length: 4 },
])

const encoder = new TextEncoder()
// A leading byte-order mark is bytes of the file too, not something to drop
const strict = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/** @param {string} text @returns {Uint8Array} */
export const bytesOf = (text) => {
  if (text.search(ESCAPED) < 0) return encoder.encode(text)
  const between = text.split(ESCAPED)
  const pieces = [...text.matchAll(ESCAPED)].flatMap((match, index) => [
    encoder.encode(between[index]),
    Uint8Array.of(match[0].charCodeAt(0) - ESCAPE_BASE),
  ])
  pieces.push(encoder.encode(between[between.length - 1]))
  const bytes = new Uint8Array(pieces.reduce((sum, piece) => sum + piece.length, 0))
  let at = 0
  for (const piece of pieces) {
    bytes.set(piece, at)
    at += piece.length
  }
  return bytes
}

/** The bytes from `start` to `end` as text, or null when they are not whole UTF-8 characters. @param {Uint8Array} bytes @param {number} start @param {number} end */
const decoded = (bytes, start, end) => {
  try {
    return strict.decode(bytes.subarray(start, end))
  } catch (error) {
    if (error instanceof TypeError) return null
    throw error
  }
}

/**
 * The whole character starting at `at` and its length in bytes, or the byte there escaped when it starts none.
 * @param {Uint8Array} bytes @param {number} at @returns {{ text: string, length: number }}
 */
const characterAt = (bytes, at) => {
  const length = UTF8_LENGTH.find(({ below }) => bytes[at] < below)?.length ?? 0
  const text = length && at + length <= bytes.length ? decoded(bytes, at, at + length) : null
  return text === null ? { text: String.fromCharCode(ESCAPE_BASE + bytes[at]), length: 1 } : { text, length }
}

/** @param {Uint8Array} bytes @returns {string} */
export const textOf = (bytes) => {
  // Most text is whole characters throughout
  const whole = decoded(bytes, 0, bytes.length)
  if (whole !== null) return whole
  let text = ''
  for (let at = 0; at < bytes.length; ) {
    const character = characterAt(bytes, at)
    text += character.text
    at += character.length
  }
  return text
}

/** @param {string} text */
export const byteCount = (text) => bytesOf(text).length

/** Characters, not counting the bytes that are not part of one (`wc -m`). @param {string} text */
export const characterCount = (text) => [...text.replace(ESCAPED, '')].length
