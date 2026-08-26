import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Browser mode: the code depends on Blob streams, SubtleCrypto, IndexedDB and the DOM.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      // otherwise vitest tries to resolve jsdom even in browser mode
      environment: 'node',
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({
          launchOptions: { channel: process.env.VITEST_BROWSER_CHANNEL ?? 'chrome' },
        }),
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
)
