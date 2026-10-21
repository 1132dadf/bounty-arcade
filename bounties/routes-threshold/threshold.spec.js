import { test, expect } from '@playwright/test'

test('routes threshold input recomputes gain', async ({ page }) => {
  await page.goto('/apps/routes/')
  await expect(page.getByTestId('threshold')).toHaveValue('0')
  await page.getByTestId('sample').selectOption('samples/riverside-loop.gpx')
  await expect(page.getByTestId('stat-gain')).toHaveText('53 m')
  await page.getByTestId('threshold').fill('1')
  await expect(page.getByTestId('stat-gain')).not.toHaveText('53 m')
})
