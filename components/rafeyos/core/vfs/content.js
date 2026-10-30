// The only adapter between the site's content sources and rafeyOS. Everything downstream
// (vfs, terminal commands, apps) reads the plain object built here, never lib/* directly.
import { age, bioDescription, skillsDescription, compactReadme } from '@/lib/descriptions'
import { projects, getVisibleProjects, linkName } from '@/lib/projects'
import { MILESTONES, ARTIST_BLURB, getFeaturedTrack } from '@/lib/music'
import { getPublishedPosts, readingMinutes } from '@/lib/posts'
import { EMAIL, LINKEDIN_URL, LINKEDIN_NAME, DEFAULT_MAIL, mailtoHref } from '@/lib/contact'
import { HELP_LINES, HELP_HINT } from '@/lib/help'

// "2:38": track times as the home terminal's player shows them; the waveform's 0..1 bar levels
export { formatTime as formatDuration, computeLevels } from '@/lib/music'

const ENTITIES = Object.freeze({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' })

/** Strips tags and decodes the handful of entities the terminal strings use. */
export const htmlToText = (html) =>
  String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name) => ENTITIES[name])

export const slugify = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Shown like a path, not a URL: no scheme or trailing slash (matches ProjectsOutput.jsx)
export const displayLink = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

const withTrailingNewline = (text) => (text.endsWith('\n') ? text : `${text}\n`)

export const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

const buildProjects = () =>
  getVisibleProjects().map((project) => {
    const index = projects.indexOf(project)
    return {
      index,
      id: project.id,
      title: project.title,
      slug: slugify(project.title),
      description: project.description,
      link: project.link ?? null,
      linkLabel: project.link ? displayLink(project.link) : null,
      linkName: project.link ? linkName(project.link) : null,
    }
  })

const buildPosts = () =>
  getPublishedPosts().map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    content: post.content,
    minutes: readingMinutes(post.content),
  }))

const buildMusic = () => {
  const { id, title, artist, src, sizeBytes, durationSeconds } = getFeaturedTrack()
  return {
    track: { id, title, artist, src, sizeBytes, durationSeconds },
    blurb: ARTIST_BLURB,
    milestones: MILESTONES.map(({ year, event, upcoming }) => ({ year, event, upcoming: Boolean(upcoming) })),
  }
}

const buildContact = () => ({
  email: EMAIL,
  linkedinUrl: LINKEDIN_URL,
  linkedinName: LINKEDIN_NAME,
  defaultMail: { ...DEFAULT_MAIL },
  mailtoHref: mailtoHref(DEFAULT_MAIL),
  // Mail rebuilds the link as the visitor edits the subject and body
  mailtoFor: ({ subject, body }) => mailtoHref({ subject, body }),
})

/**
 * @typedef {{ index: number, id: number, title: string, slug: string, description: string, link: string | null, linkLabel: string | null, linkName: string | null }} Project
 * @typedef {{ slug: string, title: string, date: string, excerpt: string, content: string, minutes: number }} Post
 * @typedef {{ id: string, title: string, artist: string, src: string, sizeBytes: number, durationSeconds: number }} Track
 * @typedef {{ year: number, event: string, upcoming: boolean }} Milestone
 * @typedef {{ subject: string, body: string }} Mail
 * @typedef {{
 *   email: string,
 *   linkedinUrl: string,
 *   linkedinName: string,
 *   defaultMail: Mail,
 *   mailtoHref: string,
 *   mailtoFor: (mail: Mail) => string,
 * }} Contact
 * @typedef {Readonly<{
 *   bio: string,
 *   skills: string,
 *   readme: string,
 *   projects: readonly Project[],
 *   posts: readonly Post[],
 *   music: { track: Track, blurb: string, milestones: readonly Milestone[] },
 *   contact: Contact,
 *   help: { lines: readonly string[], hint: string },
 *   profile: { age: number },
 * }>} Content
 */

/** @returns {Content} deep-frozen plain data */
export const buildContent = () =>
  deepFreeze({
    bio: withTrailingNewline(htmlToText(bioDescription())),
    skills: withTrailingNewline(htmlToText(skillsDescription)),
    readme: compactReadme,
    projects: buildProjects(),
    posts: buildPosts(),
    music: buildMusic(),
    contact: buildContact(),
    help: { lines: HELP_LINES.map(htmlToText), hint: htmlToText(HELP_HINT) },
    // Rafey's age as the bio states it, for Settings → About
    profile: { age: age() },
  })
