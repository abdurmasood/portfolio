import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  // Vite's built-in oxc transform handles JSX with the automatic runtime, as Next does
  resolve: {
    alias: [{ find: /^@\//, replacement: root }],
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
      // Scoped to modules added or extracted for rafeyOS
      include: ['lib/contact.js', 'lib/help.js', 'lib/loadRafeyOS.js', 'components/rafeyos/**/*.{js,jsx}'],
      exclude: ['**/*.test.{js,jsx}', 'components/rafeyos/testing/**'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
})
