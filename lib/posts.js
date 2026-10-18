import { blogPosts } from './blogData'

const WORDS_PER_MINUTE = 200

export const getPublishedPosts = () =>
  blogPosts
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date))

export const getPostBySlug = (slug) =>
  getPublishedPosts().find((post) => post.slug === slug)

export const readingMinutes = (markdown) => {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
