import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGpx, haversine, timing, formatDuration } from '../../apps/routes/logic.js'

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`)

test('parses time', () => {
  const g = parseGpx('<gpx><trk><trkseg><trkpt lat="0" lon="0"><time>2026-01-01T00:00:00Z</time></trkpt><trkpt lat="0" lon="1"/></trkseg></trk></gpx>')
  assert.equal(g.points[0].time, Date.UTC(2026, 0, 1))
  assert.equal('time' in g.points[1], false)
})

test('elapsed', () => {
  const t = timing([0, 1, 2].map(i => ({ lat: 0, lon: i * 0.01, ele: null, time: i * 60000 })))
  assert.equal(t.elapsed, 120000)
})

test('stops excluded', () => {
  const pts = [[0, 0], [0.001, 60000], [0.001, 600000]].map(([lon, time]) => ({ lat: 0, lon, ele: null, time }))
  const t = timing(pts)
  assert.equal(t.elapsed, 600000)
  assert.equal(t.moving, 60000)
  near(t.avgSpeed, haversine(pts[0], pts[1]) / 60, 0.01)
})

test('missing time', () => {
  const t = timing([{ lat: 0, lon: 0, ele: null, time: 0 }, { lat: 0, lon: 0.01, ele: null }])
  assert.deepEqual(t, { elapsed: null, moving: null, avgSpeed: null })
})

test('format', () => {
  assert.equal(formatDuration(3723000), '1:02:03')
  assert.equal(formatDuration(null), '—')
})
