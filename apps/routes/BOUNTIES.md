# Routes bounties

Each task is independent. A requester adds the listed tests before posting the bounty; the claim pays when `node --test apps/routes/test/*.test.js` and `npx playwright test apps/routes` pass with the new tests and every existing test unchanged.

## 1. Segments and gaps

`parseGpx` flattens every `<trkpt>` into one list, so a GPX with two `<trkseg>` blocks (a paused recording, or a ferry crossing) counts the straight line across the gap as distance. Return `segments: [[point, ...], ...]` alongside `points`, and make distance and gain/loss sum within segments only. Draw each segment as its own `<polyline>` in `#track`.

Acceptance tests (`test/segments.test.js`, `test/app.spec.js`):
- `parses two segments`: a GPX string with two `<trkseg>` blocks of 2 and 3 points gives `segments.length === 2`, lengths `[2, 3]`, and `points.length === 5`.
- `distance skips gaps`: segments `[(0,0),(0,0.01)]` and `[(10,10),(10,10.01)]` give `stats(...).distance` within 1 m of `haversine((0,0),(0,0.01)) + haversine((10,10),(10,10.01))`.
- `gain skips gaps`: segment elevations `[100, 110]` and `[500, 490]` give gain 10 and loss 10.
- `samples unchanged`: both bundled samples have one segment and the same distance as before (4020.8 m and 9105.4 m, within 1 m).
- Browser: uploading the two-segment file via `#file` yields `#track polyline` count 2.

## 2. Gain/loss threshold

Raw GPS and barometer noise inflates elevation gain: the flat Riverside Loop reports 53 m. Add `stats(points, { threshold })` (metres, default 0, which keeps current results) that counts a climb or descent only once elevation has moved at least `threshold` from the last counted turning point (hysteresis). Add a numeric input `#threshold` (data-testid `threshold`, default 0) that recomputes the stats panel.

Acceptance tests (`test/threshold.test.js`, `test/app.spec.js`):
- `default matches raw`: for both samples, `stats(points)` and `stats(points, { threshold: 0 })` return identical gain and loss.
- `noise ignored`: elevations `[100, 101, 100, 101, 100]` with threshold 2 give gain 0, loss 0.
- `real climb counted`: elevations `[100, 101, 100, 105, 104, 110]` with threshold 2 give gain 10, loss 0 (not 12 and 2).
- `descent counted`: `[200, 190, 191, 180]` with threshold 3 gives gain 0, loss 20.
- `net preserved`: for the riverside sample, threshold 1 gives gain strictly less than 53 m and `|gain - loss| < 1`.
- Browser: setting `#threshold` to 1 on Riverside Loop changes `#stat-gain` to a value other than `53 m`.

## 3. Time, moving time and speed

Most recorded GPX has `<time>` on each point. Parse it to `time` (ms since epoch, `null` when absent) and add a pure `timing(points)` returning `{ elapsed, moving, avgSpeed }`, where `moving` sums only intervals whose speed is at least 0.5 m/s and `avgSpeed` is distance over moving time in m/s; all three are `null` if any point lacks a time. Show elapsed and moving time as `h:mm:ss` in new `#stat-elapsed` and `#stat-moving` cells, and `—` when absent.

Acceptance tests (`test/timing.test.js`, `test/app.spec.js`):
- `parses time`: `<trkpt lat="0" lon="0"><time>2026-01-01T00:00:00Z</time></trkpt>` parses to `time === Date.UTC(2026, 0, 1)`; a point without `<time>` has `time === null`.
- `elapsed`: three points 60 s apart give `elapsed === 120000`.
- `stops excluded`: points at (0,0) t=0, (0,0.001) t=60 s, (0,0.001) t=600 s give `moving === 60000` and `avgSpeed` within 0.01 of `haversine(...)/60`.
- `missing time`: one point without time makes all three fields `null`.
- `format`: `formatDuration(3723000) === '1:02:03'`, `formatDuration(null) === '—'`.
- Browser: bundled samples (no times) show `—` in `#stat-elapsed`; uploading a timed 3-point file shows `0:02:00`.
