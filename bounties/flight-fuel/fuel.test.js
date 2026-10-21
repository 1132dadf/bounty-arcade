import test from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../../apps/flight/logic.js'

const DT = 1 / 60
const flat = () => ({ spacing: 10, terrain: Array(2000).fill(0), gates: [] })
const run = (s, input, seconds) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) s = L.step(s, input, DT)
  return s
}

test('fuel burns with throttle', () => {
  assert.equal(L.BURN, 1 / 90)
  assert.equal(L.initialState(flat()).fuel, 1)
  const s = run({ ...L.initialState(flat(), { y: 300 }), throttle: 1 }, { throttle: 1 }, 45)
  assert.equal(s.status, 'flying')
  assert.ok(Math.abs(s.fuel - 0.5) < 1e-9, `${s.fuel}`)
})

test('idle burns nothing', () => {
  const s = run({ ...L.initialState(flat(), { y: 2000 }), throttle: 0 }, { throttle: -1 }, 30)
  assert.equal(s.status, 'flying')
  assert.equal(s.fuel, 1)
})

test('fuel never goes negative', () => {
  const s = run({ ...L.initialState(flat(), { y: 300 }), throttle: 1 }, { throttle: 1 }, 200)
  assert.equal(s.status, 'flying')
  assert.equal(s.fuel, 0)
  assert.equal(s.throttle, 1)
})

test('empty tank glides', () => {
  const empty = run({ ...L.initialState(flat(), { y: 2000 }), fuel: 0 }, {}, 60)
  const full = run({ ...L.initialState(flat(), { y: 2000 }), fuel: 1 }, {}, 60)
  assert.ok(empty.y < 2000 - 60, `${empty.y}`)
  assert.ok(empty.throttle > 0)
  assert.ok(Math.abs(full.y - 2000) < 1e-6)
})

test('determinism', () => {
  const inputs = Array.from({ length: 1200 }, (_, i) => ({ pitch: [0, 1, 0, -1][(i >> 6) % 4], throttle: i % 300 < 100 ? 1 : 0 }))
  const fly = () => inputs.reduce((s, inp) => L.step(s, inp, DT), L.initialState(L.makeLevel(99)))
  const s = fly()
  assert.ok(s.fuel > 0 && s.fuel < 1)
  assert.deepEqual(s, fly())
})
