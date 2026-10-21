import { test, expect } from '@playwright/test'

test('replay link solves a level', async ({ page }) => {
  await page.goto('/apps/puzzle/#level=2&moves=lLLLrrrddLLL')
  await expect(page.locator('#level')).toHaveValue('2')
  await expect(page.locator('#moves')).toHaveText('12')
  await expect(page.locator('#status')).toContainText('Solved')
})

test('blocked replay reports the step', async ({ page }) => {
  await page.goto('/apps/puzzle/#level=0&moves=l')
  await expect(page.locator('#status')).toContainText('blocked')
  await expect(page.locator('#moves')).toHaveText('0')
})
