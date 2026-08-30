import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Kept separate from vite.config.ts: the installed Vite version does not carry
// Vitest's `test` key in its config type, so merging here keeps `tsc -b` clean.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
)
