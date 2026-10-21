import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'apps/*/test/*.spec.js',
  use: { baseURL: 'http://localhost:8080' },
  webServer: { command: 'node serve.mjs', url: 'http://localhost:8080', reuseExistingServer: true },
})
