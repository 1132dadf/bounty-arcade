import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyAction, emptyBoard, validate } from '../../apps/board/logic.js'

const run = (actions, board = emptyBoard()) => actions.reduce(applyAction, board)
const add = (column, text) => ({ type: 'add', column, text })
const limit = n => ({ type: 'setLimit', column: 'doing', limit: n })

test('setLimit stores the limit', () => {
  const b = run([add('todo', 'a')])
  const limited = applyAction(b, limit(2))
  assert.deepEqual(limited.limits, { doing: 2 })
  assert.deepEqual(applyAction(limited, limit(null)), b)
})

test('add and move into a full column throw', () => {
  const b = run([add('todo', 'a'), add('doing', 'b'), limit(1)])
  assert.throws(() => applyAction(b, add('doing', 'c')), /WIP limit/)
  assert.throws(() => applyAction(b, { type: 'move', id: 'c1', to: 'doing' }), /WIP limit/)
  const two = run([add('doing', 'x'), add('doing', 'y'), limit(2)])
  assert.deepEqual(applyAction(two, { type: 'move', id: 'c2', to: 'doing', index: 0 }).columns.doing.map(c => c.text), ['y', 'x'])
})

test('lowering the limit below the current count throws', () => {
  assert.throws(() => run([add('doing', 'a'), add('doing', 'b'), limit(1)]), /WIP limit/)
})

test('validate accepts old and new boards', () => {
  const old = run([add('doing', 'a'), add('doing', 'b')])
  assert.deepEqual(validate(old), old)
  assert.deepEqual(validate({ ...old, limits: { doing: 2 } }), { ...old, limits: { doing: 2 } })
  for (const limits of [{ doing: 0 }, { doing: 1.5 }, { todo: 2 }, { doing: 1 }])
    assert.throws(() => validate({ ...old, limits }), /invalid board/)
})

test('limits survive export and import', () => {
  const b = run([add('doing', 'a'), limit(3)])
  assert.deepEqual(applyAction(emptyBoard(), { type: 'import', board: JSON.parse(JSON.stringify(b)) }), b)
})
