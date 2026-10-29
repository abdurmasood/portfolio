// @ts-check
// Settings → About: fixed wording in one place, plus the rows derived from content
// (age, artist name and how many projects and posts there are). neofetch reads it too.

export const ABOUT_TEXT = Object.freeze({
  product: 'rafeyOS 24.04 LTS',
  deviceName: 'rafey.ai',
  hardwareModel: 'A. Rafey Masood · built 1997, Islamabad',
  processor: 'Self-taught full-stack developer',
  education: "Computer Science, then AI (2024), King's College London",
  company: 'Founded 2024',
  studio: 'Record label and studio, East London',
  windowingSystem: 'Wayland',
})

/** @param {number} count @param {string} noun */
const counted = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * @typedef {{ title: string, value: string }} AboutRow
 * @param {{ profile: { age: number }, music: { track: { artist: string } }, projects: readonly unknown[], posts: readonly unknown[] }} content
 * @returns {{ hardware: AboutRow[], details: AboutRow[] }}
 */
export const aboutRows = (content) => ({
  hardware: [
    { title: 'Hardware Model', value: ABOUT_TEXT.hardwareModel },
    { title: 'Memory', value: `${content.profile.age} years` },
    { title: 'Processor', value: ABOUT_TEXT.processor },
    { title: 'Graphics', value: `${content.music.track.artist} (music)` },
    { title: 'Disk Capacity', value: `${counted(content.projects.length, 'project')} · ${counted(content.posts.length, 'post')}` },
  ],
  details: [
    { title: 'Education', value: ABOUT_TEXT.education },
    { title: 'Company', value: ABOUT_TEXT.company },
    { title: 'Studio', value: ABOUT_TEXT.studio },
    { title: 'Windowing System', value: ABOUT_TEXT.windowingSystem },
  ],
})
