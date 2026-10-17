/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
    // rafeyOS ships its own scoped CSS; its class names (.flat, .row, .grow…) must not become utilities
    "!./components/rafeyos/**",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}