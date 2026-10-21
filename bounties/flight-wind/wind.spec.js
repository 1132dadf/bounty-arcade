import { test, expect } from '@playwright/test'

test('HUD shows the level wind', async ({ page }) => {
  await page.goto('/apps/flight/')
  await expect(page.locator('#wind')).toHaveText(/^-?\d+ m\/s$/)
  await expect(page.getByTestId('wind')).toHaveText(/^-?\d+ m\/s$/)
})
