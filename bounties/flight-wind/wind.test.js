import test from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../../apps/flight/logic.js'

const DT = 1 / 60
const flat = wind => ({ spacing: 10, terrain: Array(2000).fill(0), gates: [], ...(wind === undefined ? {} : { wind }) })
const run = (s, input, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) s = L.step(s, input, DT)
  return s
}

test('wind is seeded', () => {
  const winds = Array.from({ length: 50 }, (_, i) => L.makeLevel(i + 1).wind)
  winds.forEach((w, i) => assert.equal(w, L.makeLevel(i + 1).wind))
  assert.ok(winds.every(w => typeof w === 'number' && w >= -12 && w <= 12))
  assert.ok(winds.some(w => w < 0) && winds.some(w => w > 0))
})

test('zero wind is unchanged', () => {
  const inputs = Array.from({ length: 600 }, (_, i) => ({ pitch: [0, 1, 0, -1][(i >> 5) % 4], throttle: i % 200 < 70 ? 1 : -1 }))
  const fly = level => ({ ...inputs.reduce((s, inp) => L.step(s, inp, DT), L.initialState(level, { y: 300 })), level: null })
  assert.deepEqual(fly(flat(0)), fly(flat()))
})

test('trim holds in a headwind', () => {
  const s = run({ ...L.initialState(flat(-10)), vx: 30 }, {}, 60)
  assert.equal(s.status, 'flying')
  assert.ok(Math.abs(s.y - 120) < 1e-6)
  assert.ok(Math.abs(s.vx - 30) < 1e-6)
})

test('tailwind covers more ground', () => {
  const fly = wind => run({ ...L.initialState(flat(wind)), vx: L.CRUISE + wind }, {}, 20)
  const tail = fly(10), head = fly(-10)
  assert.equal(tail.status, 'flying')
  assert.equal(head.status, 'flying')
  assert.ok(tail.x - head.x >= 390, `${tail.x - head.x}`)
})
