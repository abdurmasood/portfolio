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

export const HOME = '~'
export const TRASH = 'trash'

const nameOf = (path) => (path === HOME ? 'visitor' : path.split('/').pop())

const projectText = (project) => {
  const caseStudy = project.link ? `\nCase study: ${project.link}\n` : ''
  return `${project.title}\n${'='.repeat(project.title.length)}\n\n${project.description}\n${caseStudy}`
}

const postText = (post) => `# ${post.title}\n\n_${post.date}_\n\n${post.content.trim()}\n`

const storyText = (milestones) =>
  milestones.map((m) => `${m.year}  ${m.event}${m.upcoming ? ' (upcoming)' : ''}`).join('\n') + '\n'

const desktopEntry = (name, icon, url) =>
  `[Desktop Entry]\nType=Link\nName=${name}\nIcon=${icon}\nURL=${url}\n`

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

const entriesFor = (content) => [
  [HOME, { type: 'dir' }],
  ['~/Desktop', { type: 'dir' }],
  ['~/Documents', { type: 'dir' }],
  ...musicNodes(content.music),
  ['~/blog', { type: 'dir' }],
  ...content.posts.map((post) => [`~/blog/${post.slug}.md`, { type: 'text', text: postText(post) }]),
  ...contactNodes(content.contact),
  ['~/projects', { type: 'dir' }],
  ...content.projects.map((project) => [
    `~/projects/${project.slug}.txt`,
    { type: 'text', projectIndex: project.index, text: projectText(project) },
  ]),
  ['~/bio.txt', { type: 'text', text: content.bio }],
  ['~/skills.txt', { type: 'text', text: content.skills }],
  ['~/README.txt', { type: 'text', text: content.readme }],
  [TRASH, { type: 'dir', name: 'Trash' }],
]

/** @returns {Readonly<Record<string, Readonly<object>>>} path -> node */
export const buildVfs = (content) => {
  const vfs = {}
  entriesFor(content).forEach(([path, node]) => {
    vfs[path] = Object.freeze({ path, name: nameOf(path), ...node })
  })
  return Object.freeze(vfs)
}
