// App id -> UI component. Only the apps listed in registry.js IMPLEMENTED_APPS appear here.
import { FilesApp } from './files/FilesApp'
import { TerminalApp } from './terminal/TerminalApp'
import { EditorApp } from './editor/EditorApp'
import { MailApp } from './mail/MailApp'
import { PropertiesApp } from './properties/PropertiesApp'
import { MusicApp } from './music/MusicApp'
import { SettingsApp } from './settings/SettingsApp'
import { ProjectsApp } from './projects/ProjectsApp'

export const APP_COMPONENTS = Object.freeze({
  files: FilesApp,
  terminal: TerminalApp,
  editor: EditorApp,
  music: MusicApp,
  mail: MailApp,
  projects: ProjectsApp,
  settings: SettingsApp,
  properties: PropertiesApp,
})
