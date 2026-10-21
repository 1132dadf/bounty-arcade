import { test, expect } from '@playwright/test'

test('throttle burns fuel shown in the HUD', async ({ page }) => {
  await page.goto('/apps/flight/')
  const fuel = async () => {
    const text = await page.getByTestId('fuel').textContent()
    expect(text).toMatch(/^\d+%$/)
    return parseInt(text)
  }
  const before = await fuel()
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(1000)
  await page.keyboard.up('ArrowRight')
  await page.waitForTimeout(3000)
  expect(await fuel()).toBeLessThan(before)
})
