'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { getPostBySlug, getPublishedPosts, readingMinutes } from '../../lib/posts'

const POSTS = getPublishedPosts()

const isPlainKey = (event, key) => event.key === key && !event.metaKey && !event.ctrlKey && !event.altKey

function ActivePicker({ onDone }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedIndexRef = useRef(0)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)

  selectedIndexRef.current = selectedIndex
  onDoneRef.current = onDone

  const finish = (result) => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current(result)
  }

  const open = (index) => {
    const post = POSTS[index]
    if (!post) return
    finish({ slug: post.slug })
  }

  const move = (step) => {
    setSelectedIndex((index) => Math.min(Math.max(index + step, 0), POSTS.length - 1))
  }

  // Read through a ref so the window listener below is attached once and never sees stale state
  const keyActionsRef = useRef(null)
  keyActionsRef.current = { move, open, finish }

  useEffect(() => {
    // The Enter that ran `blog` is still bubbling when this mounts; without this it would open the first post
    const mountedAt = performance.now()
    const handleKey = (event) => {
      if (event.timeStamp < mountedAt) return
      const { move, open, finish } = keyActionsRef.current
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        move(event.key === 'ArrowUp' ? -1 : 1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        open(selectedIndexRef.current)
      } else if (isPlainKey(event, 'q') || event.key === 'Escape' || (event.ctrlKey && event.key === 'c')) {
        event.preventDefault()
        finish({})
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="terminal-block">
      <p className="dim">total {POSTS.length}</p>
      <div className="gap" />
      <ul className="picker-list" aria-label="Posts">
        {POSTS.map((post, index) => {
          const isSelected = index === selectedIndex
          return (
            <li
              key={post.slug}
              className={`post-row${isSelected ? ' is-selected' : ''}`}
              aria-current={isSelected ? 'true' : undefined}
            >
              {/* Only receives taps on mobile; desktop rows stay keyboard-only (see Terminal.css) */}
              <button type="button" className="post-tap" tabIndex={-1} onClick={() => open(index)}>
                <span className="picker-mark" aria-hidden="true">{isSelected ? '›' : ''}</span>
                <span className="dim">{post.date}</span>
                <span className="dim read">{readingMinutes(post.content)} min</span>
                <span className="row-title">{post.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="gap-half" />
      <p className="music-line dim player-keys">
        <span className="player-key">↑↓</span> select · <span className="player-key">enter</span> open · <span className="player-key">esc</span> quit
      </p>
      <div className="player-taps">
        <button type="button" onClick={() => finish({})}>[ quit ]</button>
      </div>
    </div>
  )
}

export function BlogPicker({ active, slug, onDone }) {
  if (active) {
    return <ActivePicker onDone={onDone} />
  }
  // Quitting prints nothing, like the projects picker on esc
  if (!slug) return null
  return <BlogArticle slug={slug} />
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
