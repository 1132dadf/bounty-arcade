import { test, expect } from '@playwright/test'

test('best score survives reload', async ({ page }) => {
  await page.goto('/apps/puzzle/')
  await expect(page.locator('#board .player')).toHaveCount(1)
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
  await expect(page.locator('#status')).toContainText('Solved')
  await page.reload()
  const option = page.locator('#level option[value="0"]')
  await expect(option).toContainText('3')
  await expect(option).toContainText('✓')
})

test('last level is restored', async ({ page }) => {
  await page.goto('/apps/puzzle/')
  await page.getByTestId('level').selectOption('2')
  await page.reload()
  await expect(page.locator('#level')).toHaveValue('2')
  await expect(page.locator('#moves')).toHaveText('0')
})
