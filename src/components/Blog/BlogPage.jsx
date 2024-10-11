import React, { useState } from 'react';
import { ChevronRight, Clock } from 'lucide-react';

const blogPosts = [
  {
    id: 1,
    title: "Getting Started with AI",
    excerpt: "An introduction to the world of Artificial Intelligence and its impact on modern technology.",
    date: "2023-05-15",
    content: "Artificial Intelligence is revolutionizing the tech industry. This post explores the basics of AI, its current applications, and future potential.",
    minutesRead: 5
  },
  {
    id: 2,
    title: "The Future of Full-Stack Development",
    excerpt: "Exploring the evolving landscape of full-stack development and emerging technologies.",
    date: "2023-05-20",
    content: "As technology evolves, the role of full-stack developers is changing. This article discusses new tools, frameworks, and methodologies shaping the future of web development.",
    minutesRead: 7
  },
  {
    id: 3,
    title: "Music Production in the Digital Age",
    excerpt: "How technology is transforming the music industry and empowering independent artists.",
    date: "2023-05-25",
    content: "Digital tools have revolutionized music production, allowing artists to create professional-quality tracks from home studios. This post examines the impact of technology on music creation and distribution.",
    minutesRead: 6
  }
];

function BlogPage() {
  const [selectedPost, setSelectedPost] = useState(null);

  return (
    <div className="min-h-screen w-screen"> {/* Full-page background */}
      <div className="max-w-4xl mx-auto text-gray-300 p-8 font-mono">
        <h1 className="text-4xl font-bold mb-8 text-green-500">Rafey's Blog</h1>
        
        {!selectedPost ? (
          <div className="grid gap-6">
            {blogPosts.map((post) => (
              <div key={post.id} className="border border-green-500 p-4 rounded">
                <h2 className="text-2xl font-semibold mb-2 text-green-400">{post.title}</h2>
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <span>{post.date}</span>
                  <span className="mx-2">•</span>
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{post.minutesRead} min read</span>
                </div>
                <p className="mb-4">{post.excerpt}</p>
                <span 
                  onClick={() => setSelectedPost(post)}
                  className="flex items-center text-green-500 hover:text-green-400 transition-colors cursor-pointer"
                >
                  Read more <ChevronRight className="ml-1 w-4 h-4" />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <span 
              onClick={() => setSelectedPost(null)}
              className="mb-4 text-green-500 hover:text-green-400 transition-colors cursor-pointer inline-block"
            >
              &larr; Back to all posts
            </span>
            <h2 className="text-3xl font-semibold mb-2 text-green-400">{selectedPost.title}</h2>
            <div className="flex items-center text-sm text-gray-400 mb-4">
              <span>{selectedPost.date}</span>
              <span className="mx-2">•</span>
              <Clock className="w-4 h-4 mr-1" />
              <span>{selectedPost.minutesRead} min read</span>
            </div>
            <div className="prose prose-invert prose-green">
              <p>{selectedPost.content}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlogPage;