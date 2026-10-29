import { describe, expect, it } from 'vitest'
import { unavailableBanner } from '@/components/rafeyos/ui/popups/logic/useOpenPath'
import { realVfs } from '@/tests/rafeyos/helpers/testVfs'

describe('useOpenPath', () => {
  it('names the file and the missing app in the banner', () => {
    expect(unavailableBanner(realVfs, '/home/rafey/Music/storms-ahead.mp3')).toMatchObject({
      appId: 'music',
      body: "Music isn't available yet.",
    })
    expect(unavailableBanner(realVfs, '/home/rafey/contact/linkedin.desktop')).toEqual({
      appId: null,
      title: "Can't open “LinkedIn”",
      body: "Opening links isn't available yet.",
    })
  })

  it('shows the same banner for a path that vanished, without throwing', () => {
    expect(unavailableBanner(realVfs, '/home/visitor/Documents/gone.txt')).toEqual({
      appId: null,
      title: "Can't open “gone.txt”",
      body: "Opening links isn't available yet.",
    })
  })
})
