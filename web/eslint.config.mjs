import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'jsx-quotes': ['error', 'prefer-double'],
      semi: ['error', 'never'],
    },
  },
  {
    // Pages under the (app)/(auth) client-guard layouts must be Server Components
    // (a `page.tsx` exporting `instant = false` that renders a client *Client/*Form
    // body), so cacheComponents' instant-navigation validation doesn't drop them.
    files: ['app/(app)/**/page.tsx', 'app/(auth)/**/page.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExpressionStatement > Literal[value="use client"]',
          message:
            'Gated page.tsx must be a Server Component: export `instant = false` and render a client *Client/*Form component (see web/CLAUDE.md).',
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
