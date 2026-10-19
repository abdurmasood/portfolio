// @ts-check
// Builds the visitor's home folder from buildContent(). Paths are keys ("~/Music/story.txt");
// every node and the map itself are frozen, so the vfs can be shared freely.

export const NODE_TYPES = Object.freeze({
  DIR: 'dir',
  TEXT: 'text',
  AUDIO: 'audio',
  MAILTO: 'mailto',
  WEBLINK: 'weblink',
  SYMLINK: 'symlink',
})

/** @import { Content, Milestone, Track, Contact } from './content' */

/**
 * What a node holds, by type. `name` is the path's last segment unless the entry sets one (Trash).
 * @typedef {{ type: typeof NODE_TYPES.DIR }} DirFields
 * @typedef {{ type: typeof NODE_TYPES.TEXT, text: string, projectIndex?: number, user?: boolean, trashedFrom?: string }} TextFields
 * @typedef {{
 *   type: typeof NODE_TYPES.AUDIO,
 *   src: string,
 *   title: string,
 *   artist: string,
 *   sizeBytes: number,
 *   durationSeconds: number,
 * }} AudioFields
 * @typedef {{ type: typeof NODE_TYPES.MAILTO, display: string, href: string, text: string }} MailtoFields
 * @typedef {{ type: typeof NODE_TYPES.WEBLINK, display: string, href: string, text: string }} WeblinkFields
 * @typedef {{ type: typeof NODE_TYPES.SYMLINK, target: string }} SymlinkFields
 * @typedef {DirFields | TextFields | AudioFields | MailtoFields | WeblinkFields | SymlinkFields} NodeFields
 */

/**
 * A vfs entry; narrow on `type` to reach its fields.
 * @typedef {Readonly<NodeFields & { path: string, name: string }>} VfsNode
 */

/** @typedef {Readonly<Record<string, VfsNode>>} Vfs path -> node */

/** @typedef {[path: string, fields: NodeFields | (DirFields & { name: string })]} Entry */

export const HOME = '~'
export const TRASH = 'trash'

/** @param {string} path */
const nameOf = (path) => (path === HOME ? 'visitor' : path.slice(path.lastIndexOf('/') + 1))

/** @param {Content['projects'][number]} project */
const projectText = (project) => {
  const caseStudy = project.link ? `\nCase study: ${project.link}\n` : ''
  return `${project.title}\n${'='.repeat(project.title.length)}\n\n${project.description}\n${caseStudy}`
}

/** @param {Content['posts'][number]} post */
const postText = (post) => `# ${post.title}\n\n_${post.date}_\n\n${post.content.trim()}\n`

/** @param {readonly Milestone[]} milestones */
const storyText = (milestones) =>
  milestones.map((m) => `${m.year}  ${m.event}${m.upcoming ? ' (upcoming)' : ''}`).join('\n') + '\n'

/**
 * @param {string} name
 * @param {string} icon
 * @param {string} url
 */
const desktopEntry = (name, icon, url) =>
  `[Desktop Entry]\nType=Link\nName=${name}\nIcon=${icon}\nURL=${url}\n`

/**
 * @param {{ track: Track, milestones: readonly Milestone[] }} music
 * @returns {Entry[]}
 */
const musicNodes = ({ track, milestones }) => [
  ['~/Music', { type: 'dir' }],
  [`~/Music/${track.id}.mp3`, {
    type: 'audio',
    src: track.src,
    title: track.title,
    artist: track.artist,
    sizeBytes: track.sizeBytes,
    durationSeconds: track.durationSeconds,
  }],
  ['~/Music/story.txt', { type: 'text', text: storyText(milestones) }],
]

/**
 * @param {Contact} contact
 * @returns {Entry[]}
 */
const contactNodes = (contact) => [
  ['~/contact', { type: 'dir' }],
  ['~/contact/email.desktop', {
    type: 'mailto',
    display: 'Email Rafey',
    href: contact.mailtoHref,
    text: desktopEntry('Email Rafey', 'mail', `mailto:${contact.email}`),
  }],
  ['~/contact/linkedin.desktop', {
    type: 'weblink',
    display: 'LinkedIn',
    href: contact.linkedinUrl,
    text: desktopEntry('LinkedIn', 'web-browser', contact.linkedinUrl),
  }],
]

/**
 * @param {Content} content
 * @returns {Entry[]}
 */
const entriesFor = (content) => [
  [HOME, { type: 'dir' }],
  ['~/Desktop', { type: 'dir' }],
  ['~/Documents', { type: 'dir' }],
  ...musicNodes(content.music),
  ['~/blog', { type: 'dir' }],
  ...content.posts.map(/** @returns {Entry} */ (post) => [`~/blog/${post.slug}.md`, { type: 'text', text: postText(post) }]),
  ...contactNodes(content.contact),
  ['~/projects', { type: 'dir' }],
  ...content.projects.map(/** @returns {Entry} */ (project) => [
    `~/projects/${project.slug}.txt`,
    { type: 'text', projectIndex: project.index, text: projectText(project) },
  ]),
  ['~/bio.txt', { type: 'text', text: content.bio }],
  ['~/skills.txt', { type: 'text', text: content.skills }],
  ['~/README.txt', { type: 'text', text: content.readme }],
  [TRASH, { type: 'dir', name: 'Trash' }],
]

/**
 * @param {Content} content
 * @returns {Vfs}
 */
export const buildVfs = (content) => {
  /** @type {Record<string, VfsNode>} */
  const vfs = {}
  entriesFor(content).forEach(([path, node]) => {
    vfs[path] = Object.freeze({ path, name: nameOf(path), ...node })
  })
  return Object.freeze(vfs)
}
