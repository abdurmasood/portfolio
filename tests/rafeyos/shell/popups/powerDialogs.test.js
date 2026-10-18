import { describe, expect, it } from 'vitest'
import { POWER_DIALOGS, isPowerDialog } from '@/components/rafeyos/shell/popups/logic/powerDialogs'

describe('powerDialogs', () => {
  it('counts down in the power dialogs', () => {
    expect(POWER_DIALOGS.logout.body(3)).toBe('You will return to the rafey.ai terminal in 3 seconds.')
    expect(POWER_DIALOGS.poweroff.body(9)).toBe('rafeyOS will power off and return to the terminal in 9 seconds.')
    expect(POWER_DIALOGS.restart.body(5)).toBe('The system will restart automatically in 5 seconds.')
    expect(isPowerDialog('restart')).toBe(true)
    expect(isPowerDialog('openLink')).toBe(false)
  })
})
