import { resolvePath } from '@/components/rafeyos/core/vfs/paths'

// Names the home terminal advertises that don't exist as files here
const PATH_ALIASES = Object.freeze({ 'music.txt': '~/Music' })

/** resolvePath plus the home terminal's legacy aliases. */
export const target = (vfs, arg, cwd) => resolvePath(vfs, arg, cwd) ?? PATH_ALIASES[arg] ?? null
