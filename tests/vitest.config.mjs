import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '.git/',
        'docs/',
        'specs/',
        'memory/',
        '*.config.*'
      ],
      thresholds: {
        // Based on implementation delta report
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    pool: 'forks',
    include: ['tests/**/*.test.mjs'],
    exclude: ['node_modules/**', 'dist/**']
  },
  resolve: {
    alias: {
      'gitvan': resolve('./src/index.mjs'),
      'gitvan/define': resolve('./src/runtime/define.mjs'),
      'gitvan/composables': resolve('./src/composables/index.mjs')
    }
  }
})