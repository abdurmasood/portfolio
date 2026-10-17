// App id -> UI component. Only the apps listed in availability.js IMPLEMENTED_APPS appear here.
import { FilesApp } from './files/FilesApp'
import { TerminalApp } from './terminal/TerminalApp'

export const APP_COMPONENTS = Object.freeze({
  files: FilesApp,
  terminal: TerminalApp,
})
