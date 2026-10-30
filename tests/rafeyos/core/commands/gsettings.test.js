// gsettings over the visitor's saved appearance (Claude's calls 1-2): GNOME's schemas, keys and GVariant-style values
import { describe, expect, it } from 'vitest'
import { exec } from '@/components/rafeyos/core/commands/exec'
import { manPage } from '@/components/rafeyos/core/commands/manPages'
import { buildVfs, SYSTEM_COMMANDS } from '@/components/rafeyos/core/vfs/buildVfs'
import { createShellFs } from '@/components/rafeyos/core/vfs/shellFs'
import { createSettingsStore } from '@/components/rafeyos/core/settings/settingsStore'
import { settingsView } from '@/components/rafeyos/core/settings/settingsView'
import { fsStoreOn, memoryStorage, quotaError, refusingWrites } from '@/tests/rafeyos/helpers/renderRafeyOS'
import { fixtureContent } from '@/tests/rafeyos/helpers/testVfs'

const base = buildVfs(fixtureContent)
const INTERFACE = 'org.gnome.desktop.interface'
const DOCK = 'org.gnome.shell.extensions.dash-to-dock'

/** One terminal whose gsettings reads and writes `store`, with the OS preferring dark. */
const session = ({ store = createSettingsStore({ storage: memoryStorage() }), withSettings = true } = {}) => {
  const fs = createShellFs({ base, store: fsStoreOn(memoryStorage()) })
  const settings = withSettings ? settingsView({ store, prefersDark: () => true }) : undefined
  const run = (raw) => exec(raw, { fs, cwd: '/home/rafey', env: { PWD: '/home/rafey' }, lastCode: 0, content: fixtureContent, settings })
  return { store, run }
}

const texts = (out) => out.lines.map((line) => line.text)

describe('gsettings', () => {
  it('get_after_set_on_one_line_prints_the_new_value', () => {
    const { store, run } = session()

    const out = run(`gsettings set ${INTERFACE} color-scheme 'prefer-light'; gsettings get ${INTERFACE} color-scheme`)

    expect(out).toMatchObject({ code: 0 })
    expect(texts(out)).toEqual(["'prefer-light'"])
    expect(store.getState()).toEqual({ style: 'light' })
  })

  it('get_color_scheme_is_default_while_following_the_os', () => {
    const { run } = session()

    expect(texts(run(`gsettings get ${INTERFACE} color-scheme`))).toEqual(["'default'"])
    run(`gsettings set ${INTERFACE} color-scheme prefer-dark`)
    expect(texts(run(`gsettings get ${INTERFACE} color-scheme`))).toEqual(["'prefer-dark'"])
  })

  it('set_default_equals_reset', () => {
    const { store, run } = session()
    run(`gsettings set ${INTERFACE} accent-color 'blue'; gsettings set ${INTERFACE} color-scheme 'prefer-light'`)

    expect(run(`gsettings set ${INTERFACE} color-scheme "'default'"`)).toMatchObject({ lines: [], code: 0 })
    expect(store.getState()).toEqual({ accent: '#0073E5' })

    run(`gsettings set ${INTERFACE} color-scheme prefer-light; gsettings reset ${INTERFACE} color-scheme`)
    expect(store.getState()).toEqual({ accent: '#0073E5' })
    run(`gsettings reset ${INTERFACE} accent-color`)
    expect(store.getState()).toEqual({})
  })

  it('accent-color reads the saved accent by its GNOME name', () => {
    const { store, run } = session()

    expect(texts(run(`gsettings get ${INTERFACE} accent-color`))).toEqual(["'orange'"])
    run(`gsettings set ${INTERFACE} accent-color 'prussian-green'`)
    expect(store.getState()).toEqual({ accent: '#308280' })
    expect(texts(run(`gsettings get ${INTERFACE} accent-color`))).toEqual(["'prussian-green'"])
  })

  it('dock_position_and_icon_size_round_trip', () => {
    const { store, run } = session()

    run(`gsettings set ${DOCK} dock-position 'LEFT' && gsettings set ${DOCK} dash-max-icon-size 48`)

    expect(store.getState()).toEqual({ dockPos: 'left', iconSize: 48 })
    expect(texts(run(`gsettings get ${DOCK} dock-position; gsettings get ${DOCK} dash-max-icon-size`))).toEqual(["'LEFT'", '48'])
  })

  it('the wallpaper, desktop home icon and start corner round trip', () => {
    const { store, run } = session()
    const ember = "'file:///usr/share/backgrounds/rafeyos/ember.png'"

    run(`gsettings set org.gnome.desktop.background picture-uri-dark ${ember}`)
    run("gsettings set org.gnome.shell.extensions.ding show-home false; gsettings set org.gnome.shell.extensions.ding start-corner 'bottom-right'")

    expect(store.getState()).toEqual({ wall: 2, showHome: false, corner: 'br' })
    expect(texts(run('gsettings get org.gnome.desktop.background picture-uri'))).toEqual([ember])
    expect(texts(run('gsettings get org.gnome.shell.extensions.ding show-home'))).toEqual(['false'])
  })

  it('unknown_schema_key_and_value_errors_match_gnome', () => {
    const { store, run } = session()

    expect(run('gsettings get org.gnome.nope color-scheme')).toMatchObject({ lines: [{ type: 'error', text: 'No such schema “org.gnome.nope”' }], code: 1 })
    expect(run(`gsettings get ${INTERFACE} gtk-theme`)).toMatchObject({ lines: [{ type: 'error', text: 'No such key “gtk-theme”' }], code: 1 })
    expect(texts(run(`gsettings set ${DOCK} dock-position 'TOP'`))).toEqual(["`TOP' is not a valid value for key “dock-position”"])
    expect(texts(run(`gsettings set ${DOCK} dash-max-icon-size 30`))).toEqual(["`30' is not a valid value for key “dash-max-icon-size”"])
    expect(texts(run('gsettings set org.gnome.shell.extensions.ding show-home yes'))).toEqual(["`yes' is not a valid value for key “show-home”"])
    expect(run(`gsettings set ${INTERFACE} accent-color 'teal'`).code).toBe(1)
    expect(store.getState()).toEqual({})
  })

  it('prints its usage for a missing command or the wrong number of arguments', () => {
    const { run } = session()

    const usage = (out) => ({ code: out.code, error: out.lines[0].type, head: texts(out).slice(0, 2) })

    expect(usage(run('gsettings'))).toEqual({ code: 1, error: 'error', head: ['Usage:', '  gsettings COMMAND [ARGS…]'] })
    expect(texts(run('gsettings frob')).slice(0, 3)).toEqual(['Unknown command frob', '', 'Usage:'])
    expect(usage(run(`gsettings get ${INTERFACE}`))).toEqual({ code: 1, error: 'error', head: ['Usage:', '  gsettings get SCHEMA KEY'] })
    expect(usage(run(`gsettings set ${INTERFACE} color-scheme`)).head).toEqual(['Usage:', '  gsettings set SCHEMA KEY VALUE'])
    expect(usage(run('gsettings list-schemas extra')).head).toEqual(['Usage:', '  gsettings list-schemas'])
  })

  it('list_keys_list_schemas_and_list_recursively', () => {
    const { run } = session()

    expect(texts(run('gsettings list-schemas'))).toEqual([
      'org.gnome.desktop.background\norg.gnome.desktop.interface\norg.gnome.shell.extensions.dash-to-dock\norg.gnome.shell.extensions.ding',
    ])
    expect(texts(run(`gsettings list-keys ${INTERFACE}`))).toEqual(['accent-color\ncolor-scheme'])
    expect(texts(run(`gsettings list-recursively ${DOCK}`))).toEqual([`${DOCK} dash-max-icon-size 40\n${DOCK} dock-position 'BOTTOM'`])
    expect(texts(run('gsettings list-recursively | wc -l'))).toEqual(['8'])
    expect(texts(run('gsettings list-recursively | head -3'))).toEqual([
      "org.gnome.desktop.background picture-uri 'file:///usr/share/backgrounds/rafeyos/dusk.png'\n" +
        "org.gnome.desktop.background picture-uri-dark 'file:///usr/share/backgrounds/rafeyos/dusk.png'\n" +
        "org.gnome.desktop.interface accent-color 'orange'",
    ])
    expect(texts(run('gsettings list-keys org.gnome.nope'))).toEqual(['No such schema “org.gnome.nope”'])
  })

  it('set_on_full_storage_applies_but_reports_the_error', () => {
    const full = session({ store: createSettingsStore({ storage: refusingWrites(memoryStorage(), quotaError()) }) })

    expect(full.run(`gsettings set ${INTERFACE} accent-color 'purple'`)).toMatchObject({
      lines: [{ type: 'error', text: 'gsettings: error writing settings: No space left on device' }],
      code: 1,
    })
    expect(texts(full.run(`gsettings get ${INTERFACE} accent-color`))).toEqual(["'purple'"])

    const blocked = session({ store: createSettingsStore({ storage: null }) })
    expect(texts(blocked.run(`gsettings set ${DOCK} dock-position RIGHT`))).toEqual(['gsettings: error writing settings: Read-only file system'])
  })

  it('without settings it reads the defaults and cannot write, as with storage unavailable', () => {
    const { run } = session({ withSettings: false })

    expect(texts(run(`gsettings get ${DOCK} dock-position`))).toEqual(["'BOTTOM'"])
    expect(run(`gsettings set ${DOCK} dock-position LEFT`)).toMatchObject({
      lines: [{ text: 'gsettings: error writing settings: Read-only file system' }],
      code: 1,
    })
  })

  it('is a /usr/bin command with a manual page', () => {
    expect(SYSTEM_COMMANDS).toContain('gsettings')
    expect(manPage('gsettings')).toContain('gsettings set SCHEMA KEY VALUE')
  })
})
