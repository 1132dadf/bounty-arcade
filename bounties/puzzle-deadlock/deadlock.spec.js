import { test, expect } from '@playwright/test'

test('marks dead box', async ({ page }) => {
  await page.goto('/apps/puzzle/')
  await page.getByTestId('level').selectOption('1')
  for (const k of ['ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) await page.keyboard.press(k)
  await expect(page.locator('#board .dead')).toHaveCount(1)
  await expect(page.locator('#board .cell').nth(28)).toHaveClass(/\bdead\b/)
  await expect(page.locator('#status')).toContainText('Stuck')
  await page.getByTestId('undo').click()
  await expect(page.locator('#board .dead')).toHaveCount(0)
})
