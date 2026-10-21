import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyAction, emptyBoard, filterBoard } from '../../apps/board/logic.js'

const board = () => [['todo', 'Fix login'], ['doing', 'login page copy'], ['done', 'Ship']]
  .reduce((b, [column, text]) => applyAction(b, { type: 'add', column, text }), emptyBoard())

test('filterBoard returns matching cards per column', () => {
  assert.deepEqual(filterBoard(board(), 'LOGIN'), { todo: ['c1'], doing: ['c2'], done: [] })
})

test('blank query matches everything', () => {
  for (const q of ['', '   ']) assert.deepEqual(filterBoard(board(), q), { todo: ['c1'], doing: ['c2'], done: ['c3'] })
})

test('filterBoard does not mutate the board', () => {
  const b = board()
  const snapshot = structuredClone(b)
  filterBoard(b, 'login')
  assert.deepEqual(b, snapshot)
})
