import { test, expect } from '@playwright/test'

test('a full Doing column disables moving into it, across reload', async ({ page }) => {
  await page.goto('/apps/board/')
  const board = page.getByTestId('board')
  await expect(board).toHaveAttribute('data-ready', 'true')

  await page.getByTestId('limit-doing').fill('1')
  for (const text of ['alpha', 'beta']) {
    await page.getByTestId('new-todo').fill(text)
    await page.getByTestId('add-todo').click()
  }
  const todo = page.getByTestId('column-todo').getByTestId('card')
  await expect(todo).toHaveCount(2)
  await todo.first().locator('[data-action="right"]').click()
  await expect(page.getByTestId('column-doing').getByTestId('card')).toHaveText(/alpha/)
  await expect(todo.first().locator('[data-action="right"]')).toBeDisabled()
  await expect(board).toHaveAttribute('data-saved', '4')

  await page.reload()
  await expect(board).toHaveAttribute('data-ready', 'true')
  await expect(page.getByTestId('limit-doing')).toHaveValue('1')
  await expect(todo.first()).toHaveText(/beta/)
  await expect(todo.first().locator('[data-action="right"]')).toBeDisabled()
})
