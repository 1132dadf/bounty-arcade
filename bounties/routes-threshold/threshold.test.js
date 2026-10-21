import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseGpx, stats } from '../../apps/routes/logic.js'

const sample = f => parseGpx(readFileSync(new URL(`../../apps/routes/samples/${f}`, import.meta.url), 'utf8')).points
const track = eles => eles.map((ele, i) => ({ lat: 0, lon: i * 0.001, ele }))
const gl = (eles, threshold) => { const s = stats(track(eles), { threshold }); return [s.gain, s.loss] }

test('default matches raw', () => {
  for (const f of ['alpine-climb.gpx', 'riverside-loop.gpx']) {
    const a = stats(sample(f)), b = stats(sample(f), { threshold: 0 })
    assert.deepEqual([b.gain, b.loss], [a.gain, a.loss])
  }
})

test('noise ignored', () => assert.deepEqual(gl([100, 101, 100, 101, 100], 2), [0, 0]))

test('real climb counted', () => assert.deepEqual(gl([100, 101, 100, 105, 104, 110], 2), [10, 0]))

test('descent counted', () => assert.deepEqual(gl([200, 190, 191, 180], 3), [0, 20]))

test('climb extends', () => assert.deepEqual(gl([100, 103, 104, 102], 2), [4, 2]))

test('net preserved', () => {
  const s = stats(sample('riverside-loop.gpx'), { threshold: 1 })
  assert.ok(s.gain < 50, `gain ${s.gain}`)
  assert.ok(Math.abs(s.gain - s.loss) < 1, `gain ${s.gain} loss ${s.loss}`)
})
