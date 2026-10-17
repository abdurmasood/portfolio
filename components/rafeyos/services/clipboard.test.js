import { describe, expect, it, vi } from 'vitest'
import { browserClipboard, copyQuietly } from './clipboard'

describe('clipboard', () => {
  it('writes through the browser Clipboard API', async () => {
    const writeText = vi.fn(() => Promise.resolve())

    await browserClipboard({ navigator: { clipboard: { writeText } } }).writeText('hi')

    expect(writeText).toHaveBeenCalledWith('hi')
  })

  it('resolves quietly when the API is missing, throws or rejects', async () => {
    await expect(copyQuietly(browserClipboard({ navigator: {} }), 'x')).resolves.toBeUndefined()
    await expect(copyQuietly(browserClipboard(undefined), 'x')).resolves.toBeUndefined()
    await expect(copyQuietly({ writeText: () => Promise.reject(new Error('no')) }, 'x')).resolves.toBeUndefined()
    await expect(
      copyQuietly({ writeText: () => { throw new Error('insecure') } }, 'x'),
    ).resolves.toBeUndefined()
    await expect(copyQuietly(null, 'x')).resolves.toBeUndefined()
  })
})
