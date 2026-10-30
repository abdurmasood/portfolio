// neofetch (Claude's call 6): the approved logo beside real fields from /etc/os-release, uname, the shell's uptime,
// the saved appearance and Settings → About
import { describe, expect, it } from 'vitest'
import { exec } from '@/components/rafeyos/core/commands/exec'
import { neofetchUptime } from '@/components/rafeyos/core/commands/builtins/system'
import { manPage } from '@/components/rafeyos/core/commands/manPages'
import { ABOUT_TEXT, aboutRows } from '@/components/rafeyos/core/catalog/about'
import * as aboutData from '@/components/rafeyos/apps/settings/logic/aboutData'
import { createSettingsStore } from '@/components/rafeyos/core/settings/settingsStore'
import { settingsView } from '@/components/rafeyos/core/settings/settingsView'
import { buildVfs, SYSTEM_COMMANDS } from '@/components/rafeyos/core/vfs/buildVfs'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { FIXED_NOW, fsStoreOn, memoryStorage } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

const content = { ...fixtureContent, profile: { age: 30 } }
const base = buildVfs(content)
const SECOND = 1000
const INTERFACE = 'org.gnome.desktop.interface'

/** One terminal started 3 minutes before FIXED_NOW; `settings` is the saved appearance it sees, if any. */
const session = ({ settings } = {}) => {
  const fs = createShellFs({ base, store: fsStoreOn(memoryStorage()) })
  const startedAt = new Date(FIXED_NOW.getTime() - 3 * 60 * SECOND)
  return (raw) =>
    exec(raw, { fs, cwd: '/home/rafey', env: { PWD: '/home/rafey' }, lastCode: 0, content, now: () => FIXED_NOW, startedAt, settings })
}

const LOGO = ["   .-'''-.", "  /  .-.  \\", " |  ( r )  |", "  \\  '-'  /", "   '-...-'"]

const PLAIN = [
  "   .-'''-.      visitor@rafey.ai",
  '  /  .-.  \\     ----------------',
  ' |  ( r )  |    OS: rafeyOS 24.04 LTS x86_64',
  "  \\  '-'  /     Host: A. Rafey Masood · built 1997, Islamabad",
  "   '-...-'      Kernel: 6.8.0-rafey",
  '                Uptime: 3 mins',
  '                Shell: bash',
  '                DE: GNOME · Wayland',
  '                Theme: Dark · Orange accent',
  '                CPU: Self-taught full-stack developer',
  '                Memory: 30 years',
].join('\n')

/** The Theme row's value. */
const theme = (out) => out.lines[0].rows.find((row) => row.label === 'Theme').value

describe('neofetch', () => {
  it('neofetch_prints_logo_and_real_fields', () => {
    const out = session()('neofetch')

    expect(out.code).toBe(0)
    expect(out.lines).toEqual([
      {
        type: 'fetch',
        logo: LOGO,
        title: 'visitor@rafey.ai',
        rows: [
          { label: 'OS', value: 'rafeyOS 24.04 LTS x86_64' },
          { label: 'Host', value: 'A. Rafey Masood · built 1997, Islamabad' },
          { label: 'Kernel', value: '6.8.0-rafey' },
          { label: 'Uptime', value: '3 mins' },
          { label: 'Shell', value: 'bash' },
          { label: 'DE', value: 'GNOME · Wayland' },
          { label: 'Theme', value: 'Dark · Orange accent' },
          { label: 'CPU', value: 'Self-taught full-stack developer' },
          { label: 'Memory', value: '30 years' },
        ],
      },
    ])
    expect(SYSTEM_COMMANDS).toContain('neofetch')
    expect(session()('which neofetch').lines.map((line) => line.text)).toEqual(['/usr/bin/neofetch'])
    expect(manPage('neofetch')).toContain('neofetch - ')
  })

  it("words the uptime as neofetch does: plurals, empty fields left out, seconds only under a minute", () => {
    expect(neofetchUptime(42)).toBe('42 secs')
    expect(neofetchUptime(60)).toBe('1 min')
    expect(neofetchUptime(3 * 60 + 59)).toBe('3 mins')
    expect(neofetchUptime(60 * 60)).toBe('1 hour')
    expect(neofetchUptime(65 * 60)).toBe('1 hour, 5 mins')
    expect(neofetchUptime((2 * 24 * 60 + 1) * 60)).toBe('2 days, 1 min')
    expect(neofetchUptime((24 * 60 + 2 * 60 + 2) * 60)).toBe('1 day, 2 hours, 2 mins')
  })

  it('theme_field_follows_settings', () => {
    const store = createSettingsStore({ storage: memoryStorage() })
    let prefersDark = true
    const run = session({ settings: settingsView({ store, prefersDark: () => prefersDark }) })

    expect(theme(run('neofetch'))).toBe('Dark · Orange accent')
    prefersDark = false
    expect(theme(run('neofetch'))).toBe('Light · Orange accent')
    expect(theme(run(`gsettings set ${INTERFACE} accent-color 'prussian-green'; neofetch`))).toBe('Light · Prussian green accent')
    expect(theme(run(`gsettings set ${INTERFACE} color-scheme 'prefer-dark'; neofetch`))).toBe('Dark · Prussian green accent')
  })

  it('neofetch_in_a_pipe_is_plain_text', () => {
    const run = session()

    expect(run('neofetch | cat').lines).toEqual([{ type: 'pre', text: PLAIN }])
    run('neofetch > /tmp/fetch.txt')
    expect(run('cat /tmp/fetch.txt').lines).toEqual([{ type: 'pre', text: PLAIN }])
    expect(run('neofetch | wc -l').lines).toEqual([{ type: 'pre', text: '11' }])
  })

  it('about_page_still_matches', () => {
    expect(aboutData.ABOUT_TEXT).toBe(ABOUT_TEXT)
    expect(aboutData.aboutRows).toBe(aboutRows)
    const { hardware } = aboutRows(content)
    const about = Object.fromEntries(hardware.map((row) => [row.title, row.value]))
    const fields = Object.fromEntries(session()('neofetch').lines[0].rows.map((row) => [row.label, row.value]))

    expect(fields).toMatchObject({ Host: about['Hardware Model'], CPU: about.Processor, Memory: about.Memory })
    expect(fields.DE).toBe(`GNOME · ${ABOUT_TEXT.windowingSystem}`)
  })
})
