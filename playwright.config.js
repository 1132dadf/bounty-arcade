import { defineConfig } from '@playwright/test'

const checks = process.env.CHECKS

export default defineConfig({
  testDir: '.',
  testMatch: ['apps/*/test/*.spec.js', ...(checks ? [`${checks}/*.spec.js`] : [])],
  use: { baseURL: 'http://localhost:8080' },
  webServer: { command: 'node serve.mjs', url: 'http://localhost:8080', reuseExistingServer: false },
})
