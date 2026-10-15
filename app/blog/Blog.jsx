'use client'

import React, { useState } from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import blogPosts from './blogData';

function Blog() {
  const [selectedPost, setSelectedPost] = useState(null);

  return (
    <div className="min-h-screen w-screen">
      <div className="max-w-4xl mx-auto text-gray-300 p-4 sm:p-6 md:p-8 font-mono">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-green-500">Rafey's Blog</h1>
        
        {!selectedPost ? (
          <div className="grid gap-4 sm:gap-6">
            {blogPosts.map((post) => (
              <div key={post.id} className="border border-green-500 p-3 sm:p-4 rounded">
                <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-green-400">{post.title}</h2>
                <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-400 mb-2">
                  <span>{post.date}</span>
                  <span className="mx-2">•</span>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span>{post.minutesRead} min read</span>
                  </div>
                </div>
                <ReactMarkdown className="mb-3 sm:mb-4 text-sm sm:text-base prose prose-invert prose-sm max-w-none">
                  {post.excerpt}
                </ReactMarkdown>
                <span 
                  onClick={() => setSelectedPost(post)}
                  className="flex items-center text-green-500 hover:text-green-400 transition-colors cursor-pointer text-sm sm:text-base"
                >
                  Read more <ChevronRight className="ml-1 w-3 h-3 sm:w-4 sm:h-4" />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <span 
              onClick={() => setSelectedPost(null)}
              className="mb-4 text-green-500 hover:text-green-400 transition-colors cursor-pointer inline-block text-sm sm:text-base"
            >
              &larr; Back to all posts
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-green-400 mt-4">{selectedPost.title}</h2>
            <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-400 mb-4">
              <span>{selectedPost.date}</span>
              <span className="mx-2">•</span>
              <div className="flex items-center">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span>{selectedPost.minutesRead} min read</span>
              </div>
            </div>
            <ReactMarkdown className="prose prose-invert prose-green prose-sm sm:prose-base max-w-none">
              {selectedPost.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default Blog;