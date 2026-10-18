import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

// rafeyOS layers, bottom to top. A folder may import only from its own layer or the ones below;
// shell and apps share a layer but never import each other.
const RAFEYOS = '@/components/rafeyos'
const RAFEYOS_LAYERS = {
  core: ['state', 'ui', 'wm', 'shell', 'apps', 'session'],
  state: ['ui', 'wm', 'shell', 'apps', 'session'],
  ui: ['wm', 'shell', 'apps', 'session'],
  wm: ['shell', 'apps', 'session'],
  shell: ['apps', 'session'],
  apps: ['shell', 'session'],
  session: [],
}
const RELATIVE_PARENT = { group: ['../*', '../**'], message: 'Import across folders with the @/ alias.' }
const layerRule = (layer, forbidden) => ({
  files: [`components/rafeyos/${layer}/**/*.{js,jsx}`],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        RELATIVE_PARENT,
        ...(forbidden.length ? [{
          group: forbidden.map((folder) => `${RAFEYOS}/${folder}/**`),
          message: `${layer}/ sits below ${forbidden.join(', ')}; move the shared code down a layer instead.`,
        }] : []),
      ],
    }],
  },
})

export default [
  { ignores: ['dist', '.next', 'coverage'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
    },
  },
  {
    // Plain JS with JSDoc and no prop-types dependency; props are covered by component tests instead
    files: ['components/rafeyos/**/*.{js,jsx}', 'app/os/**/*.{js,jsx}'],
    rules: { 'react/prop-types': 'off' },
  },
  ...Object.entries(RAFEYOS_LAYERS).map(([layer, forbidden]) => layerRule(layer, forbidden)),
  {
    files: ['components/rafeyos/*.{js,jsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [RELATIVE_PARENT] }] },
  },
]
