import { test, expect } from '@playwright/test'

test('undo and redo a move; history is not persisted', async ({ page }) => {
  await page.goto('/apps/board/')
  const board = page.getByTestId('board')
  await expect(board).toHaveAttribute('data-ready', 'true')
  const todo = page.getByTestId('column-todo').getByTestId('card')
  const doing = page.getByTestId('column-doing').getByTestId('card')

  await page.getByTestId('new-todo').fill('alpha')
  await page.getByTestId('add-todo').click()
  await todo.locator('[data-action="right"]').click()
  await expect(doing).toHaveText(/alpha/)

  await page.getByTestId('undo').click()
  await expect(todo).toHaveText(/alpha/)
  await expect(doing).toHaveCount(0)
  await expect(page.getByTestId('redo')).toBeEnabled()

  await page.keyboard.press('Control+Shift+Z')
  await expect(doing).toHaveText(/alpha/)
  await expect(todo).toHaveCount(0)
  await expect(board).toHaveAttribute('data-saved', '4')

  await page.reload()
  await expect(board).toHaveAttribute('data-ready', 'true')
  await expect(page.getByTestId('undo')).toBeDisabled()
  await expect(doing).toHaveText(/alpha/)
})
