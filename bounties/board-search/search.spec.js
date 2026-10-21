import { test, expect } from '@playwright/test'

test('search hides non-matching cards and is not persisted', async ({ page }) => {
  await page.goto('/apps/board/')
  const board = page.getByTestId('board')
  await expect(board).toHaveAttribute('data-ready', 'true')
  for (const text of ['alpha', 'beta']) {
    await page.getByTestId('new-todo').fill(text)
    await page.getByTestId('add-todo').click()
  }
  await expect(board).toHaveAttribute('data-saved', '2')
  const visible = page.locator('[data-testid=card]:visible')
  const count = page.getByTestId('column-todo').locator('h2 span')

  await page.getByTestId('search').fill('alp')
  await expect(visible).toHaveCount(1)
  await expect(visible).toHaveText(/alpha/)
  await expect(count).toHaveText('1/2')

  await page.getByTestId('search').fill('')
  await expect(visible).toHaveCount(2)
  await expect(count).toHaveText('2')

  await page.getByTestId('search').fill('alp')
  await page.reload()
  await expect(board).toHaveAttribute('data-ready', 'true')
  await expect(page.getByTestId('search')).toHaveValue('')
  await expect(visible).toHaveCount(2)
})
