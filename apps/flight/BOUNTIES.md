# Flight bounties

Each task is independent. Its checker is `bounties/<slug>/check.yml`: the
exact tests in that folder plus every existing test (`CHECKS=bounties/<slug> npm test`),
then a judge agent that writes its own browser tests from the instruction without
seeing the patch. A claim pays when `node check.mjs bounties/<slug>/check.yml <patch>`
passes in the dev image.

## 1. Seeded wind

Levels get a constant horizontal wind, so headwind levels are slower and
tailwind levels faster over the ground. `makeLevel(seed)` adds `level.wind`
(m/s, positive = tailwind) drawn from the seeded RNG in [-12, 12]. Lift and drag
use airspeed (velocity minus wind), while position integrates ground velocity.
The HUD shows the wind in an element with `data-testid="wind"`.

Acceptance tests (`test/wind.test.js`):
- `wind is seeded`: `makeLevel(s).wind === makeLevel(s).wind` for seeds 1..50; every value is in [-12, 12]; at least one negative and one positive.
- `zero wind is unchanged`: on a flat level with `wind: 0`, 600 steps of a fixed input sequence give `deepEqual` state (ignoring `level`) to the same run on a level with no `wind` key.
- `trim holds in a headwind`: flat level, `wind: -10`, initial state with `vx = 30` (airspeed 40) at trim pitch/throttle; after 60 s, `|y - 120| < 1e-6` and `|vx - 30| < 1e-6`.
- `tailwind covers more ground`: flat level, each run starting at trim airspeed (`vx = CRUISE + wind`) and hands-off for 20 s, `wind: +10` ends with `x` at least 390 m greater than `wind: -10`.
- Playwright: `#wind` / `data-testid="wind"` text matches `/^-?\d+ m\/s$/`.

## 2. Fuel

Throttle burns fuel; an empty tank means no thrust and the plane must glide.
State gains `fuel` (starts at 1). Each step subtracts `throttle * BURN * dt`
with exported `BURN = 1 / 90` (90 s at full throttle), clamped at 0. With
`fuel === 0` the thrust term is zero, but the throttle setting is kept. The HUD
shows fuel as a percentage in `data-testid="fuel"`.

Acceptance tests (`test/fuel.test.js`):
- `fuel burns with throttle`: flat level, starting at `throttle: 1` and held there for 45 s: `fuel` is within 1e-9 of 0.5.
- `idle burns nothing`: throttle 0 for 30 s leaves `fuel === 1`.
- `fuel never goes negative`: throttle 1 for 200 s: `fuel === 0`, `throttle === 1`.
- `empty tank glides`: from cruise trim at y = 2000 with `fuel: 0`, after 60 s hands-off the plane has lost more than 60 m of altitude, while the same run with `fuel: 1` stays within 1e-6 m of 2000.
- `determinism`: the existing seeded input-sequence test still returns `deepEqual` states, now including `fuel`.
- Playwright: holding ArrowRight for 1 s, then waiting 3 s, makes the `fuel` percentage strictly lower than it was at load.

## 3. Run recording and replay

Let players share a run as a short string that reproduces it exactly. Export
`encodeRun(seed, inputs)` and `decodeRun(str)` → `{ seed, inputs }`, where
inputs is an array of per-step `{ pitch, throttle }` with values in {-1, 0, 1}.
The encoding is URL-safe (`/^[A-Za-z0-9_-]+$/`) and run-length encodes repeated
inputs. Export `replay(seed, inputs, dt)` returning the final state. The UI
records the current run, a link with `data-testid="share"` points at
`?run=<str>` for it, and opening `?run=<str>` replays it in the game.

Acceptance tests (`test/replay.test.js`):
- `round trip`: for 20 random input arrays of 0..5000 steps (from `mulberry32`), `decodeRun(encodeRun(seed, inputs))` is `deepEqual` to `{ seed, inputs }`.
- `url safe`: every encoded string matches `/^[A-Za-z0-9_-]+$/`.
- `run-length`: 3600 identical inputs encode to fewer than 40 characters.
- `replay matches step`: `replay(seed, inputs, 1/60)` is `deepEqual` to folding `step` over the same inputs from `initialState(makeLevel(seed))`.
- Playwright: loading `/apps/flight/?run=<encoded 300 steps of pitch -1 with seed 3>` reaches `data-status="crashed"` with no key presses, and `data-testid="seed"` shows `3`.
