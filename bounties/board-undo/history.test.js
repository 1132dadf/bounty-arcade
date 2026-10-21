import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyBoard, createHistory, record, undo, redo } from '../../apps/board/logic.js'

const add = text => ({ type: 'add', column: 'todo', text })
const texts = h => h.present.columns.todo.map(c => c.text)

test('undo restores the previous board and redo reapplies it', () => {
  const h = undo(record(record(createHistory(emptyBoard()), add('a')), add('b')))
  assert.deepEqual(texts(h), ['a'])
  assert.deepEqual(texts(redo(h)), ['a', 'b'])
})

test('recording after undo clears future', () => {
  const h = record(undo(record(createHistory(emptyBoard()), add('a'))), add('c'))
  assert.deepEqual(h.future, [])
  assert.deepEqual(texts(h), ['c'])
})

test('history is capped at 50', () => {
  let h = createHistory(emptyBoard())
  for (let i = 0; i < 60; i++) h = record(h, add(`card ${i}`))
  assert.equal(h.past.length, 50)
  for (let i = 0; i < 50; i++) h = undo(h)
  assert.equal(h.present.columns.todo.length, 10)
  assert.throws(() => undo(h), /nothing to undo/)
})

test('import clears history', () => {
  const h = record(record(createHistory(emptyBoard()), add('a')), add('b'))
  assert.equal(record(h, { type: 'import', board: emptyBoard() }).past.length, 0)
})
