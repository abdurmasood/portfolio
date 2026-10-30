// Commands that print Rafey's content: help, bio, projects, blog, skills, music, contact
import { pre, dim } from '@/components/rafeyos/core/commands/lines'
import { operands, result, EFFECTS } from './result'
import { APP } from '@/components/rafeyos/core/catalog/apps'
import { RAFEY_HOME } from '@/components/rafeyos/core/vfs/buildVfs'
import { joinPath } from '@/components/rafeyos/core/vfs/paths'

const PROJECT_NAME_WIDTH = 22
const SUMMARY_WORDS = 7
const EXAMPLE_PROJECT = 'leaf-line'
const STORY = joinPath(RAFEY_HOME, 'Music/story.txt')

const help = ({ content }) => result([pre(content.help.lines.join('\n')), dim(content.help.hint)])

const bio = ({ content }) => result([pre(content.bio)])

const skills = ({ content }) => result([pre(content.skills)])

const projectRow = (project) =>
  `  ${project.title.padEnd(PROJECT_NAME_WIDTH)}${project.description.split(' ').slice(0, SUMMARY_WORDS).join(' ')}…`

const projects = ({ argv, content }) => {
  if (argv.includes('--3d')) {
    return result([pre('Opening Projects…')], [{ type: EFFECTS.OPEN_APP, app: APP.PROJECTS }])
  }
  const list = content.projects
  const example = (list.find((p) => p.slug === EXAMPLE_PROJECT) ?? list[0])?.slug
  const hint = example ? `Open one with: xdg-open projects/${example}.txt   ·   ` : ''
  return result([pre(list.map(projectRow).join('\n')), dim(`${hint}3D view: projects --3d`)])
}

const blog = ({ content }) => {
  const rows = content.posts.map((post) => `${post.date}   ${post.minutes} min   ${post.title}`)
  const lines = [pre([`total ${rows.length}`, ...rows].join('\n'))]
  if (content.posts.length) lines.push(dim(`Read it: xdg-open blog/${content.posts[0].slug}.md`))
  return result(lines)
}

const musicUsage = ({ track, blurb }) =>
  result([
    pre(
      'Usage: music <command>\n\n' +
        '  story      his journey as a producer\n' +
        `  play       play ${track.title}\n`,
    ),
    dim(blurb),
  ])

const music = ({ argv, fs, content }) => {
  const { track } = content.music
  const [subcommand] = operands(argv)
  if (subcommand === 'play') {
    return result([pre(`▶ playing   ${track.title} · ${track.artist}`)], [{ type: EFFECTS.PLAY }])
  }
  if (subcommand === 'story') return result([pre(fs.vfs()[STORY].text)])
  return musicUsage(content.music)
}

const contact = ({ content }) =>
  result([
    pre(
      `email: ${content.contact.email}\nlinkedin: ${content.contact.linkedinName}\n\n` +
        'Usage: open <contact-option> (e.g. open email)',
    ),
  ])

export const contentCommands = Object.freeze({ help, bio, projects, blog, skills, music, contact })
