'use client'

import ReactMarkdown from 'react-markdown'
import { getPostBySlug, getPublishedPosts, readingMinutes } from '../../app/blog/posts'

export function BlogPostList({ onOpen }) {
  const posts = getPublishedPosts()

  return (
    <div className="terminal-block">
      <p className="dim">total {posts.length}</p>
      <div className="gap" />
      {posts.map((post) => (
        <button
          key={post.slug}
          type="button"
          className="post-row"
          onClick={() => onOpen(post.slug)}
        >
          <span className="dim">{post.date}</span>
          <span className="dim read">{readingMinutes(post.content)} min</span>
          <span className="row-title">{post.title}</span>
        </button>
      ))}
    </div>
  )
}

export function BlogArticle({ slug }) {
  const post = getPostBySlug(slug)
  if (!post) {
    return <p className="error-text">cat: blog/{slug}.md: No such file</p>
  }

  return (
    <article className="article terminal-block">
      <h1><span className="marker"># </span>{post.title}</h1>
      <p className="dim">{post.date} · {readingMinutes(post.content)} min read</p>
      <div className="md">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </article>
  )
}
