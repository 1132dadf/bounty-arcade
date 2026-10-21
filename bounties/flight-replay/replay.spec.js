import { test, expect } from '@playwright/test'

test('a shared run replays without key presses', async ({ page }) => {
  const { encodeRun } = await import('../../apps/flight/logic.js')
  const run = encodeRun(3, Array.from({ length: 300 }, () => ({ pitch: -1, throttle: 0 })))
  await page.goto(`/apps/flight/?run=${run}`)
  await expect(page.getByTestId('seed')).toHaveValue('3')
  await expect(page.getByTestId('game')).toHaveAttribute('data-status', 'crashed', { timeout: 10000 })
})
