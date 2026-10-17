import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vite's built-in oxc transform handles JSX with the automatic runtime, as Next does
  resolve: {
    // Source imports omit extensions (e.g. app/blog/posts.js -> './blogData')
    extensions: ['.js', '.jsx', '.mjs', '.json'],
  },
  test: {
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` docblock
    environment: 'node',
    include: ['**/*.test.{js,jsx}'],
    exclude: ['node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      // Scoped to modules added or extracted for rafeyOS; later phases add components/rafeyos/**
      include: ['lib/contact.js', 'lib/help.js'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
})
