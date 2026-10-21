import test from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../../apps/flight/logic.js'

const randomRun = rng => {
  const pick = () => Math.floor(rng() * 3) - 1
  const inputs = []
  for (let i = Math.floor(rng() * 5001), cur; i--;) inputs.push(cur = !cur || rng() < 0.1 ? { pitch: pick(), throttle: pick() } : { ...cur })
  return { seed: Math.floor(rng() * 1e6), inputs }
}
const runs = (rng => Array.from({ length: 20 }, () => randomRun(rng)))(L.mulberry32(5))

test('round trip', () => {
  for (const { seed, inputs } of runs) assert.deepEqual(L.decodeRun(L.encodeRun(seed, inputs)), { seed, inputs })
  assert.deepEqual(L.decodeRun(L.encodeRun(4, [])), { seed: 4, inputs: [] })
})

test('url safe', () => {
  for (const { seed, inputs } of runs) assert.match(L.encodeRun(seed, inputs), /^[A-Za-z0-9_-]+$/)
})

test('run-length', () => {
  for (const pitch of [-1, 0, 1]) for (const throttle of [-1, 0, 1])
    assert.ok(L.encodeRun(123456, Array.from({ length: 3600 }, () => ({ pitch, throttle }))).length < 40)
})

test('replay matches step', () => {
  for (const { seed, inputs } of runs.slice(0, 5))
    assert.deepEqual(L.replay(seed, inputs, 1 / 60), inputs.reduce((s, inp) => L.step(s, inp, 1 / 60), L.initialState(L.makeLevel(seed))))
})
