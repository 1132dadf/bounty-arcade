import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recordWin } from '../../apps/puzzle/logic.js'

test('recordWin stores first result', () => {
  assert.deepEqual(recordWin({}, 'Corner', 12), { Corner: { best: 12 } })
})

test('recordWin keeps the lower count', () => {
  assert.equal(recordWin({ Corner: { best: 12 } }, 'Corner', 20).Corner.best, 12)
  assert.equal(recordWin({ Corner: { best: 12 } }, 'Corner', 9).Corner.best, 9)
})

test('recordWin does not mutate input', () => {
  const p = { Corner: { best: 12 } }
  recordWin(p, 'Corner', 9)
  recordWin(p, 'First Push', 3)
  assert.deepEqual(p, { Corner: { best: 12 } })
})
