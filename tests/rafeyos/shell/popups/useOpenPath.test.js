import { describe, expect, it } from 'vitest'
import { unavailableBanner } from '@/components/rafeyos/shell/popups/js/useOpenPath'
import { realVfs } from '@/components/rafeyos/vfs/testVfs'

describe('useOpenPath', () => {
  it('names the file and the missing app in the banner', () => {
    expect(unavailableBanner(realVfs, '~/Music/storms-ahead.mp3')).toMatchObject({
      appId: 'music',
      body: "Music isn't available yet.",
    })
    expect(unavailableBanner(realVfs, '~/contact/linkedin.desktop')).toEqual({
      appId: null,
      title: "Can't open “LinkedIn”",
      body: "Opening links isn't available yet.",
    })
  })
})
