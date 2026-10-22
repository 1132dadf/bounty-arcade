export const G = 9.81
export const K = 0.0245
export const CLA = 5
export const CD0 = 0.02
export const CDI = 0.1
export const ALPHA_STALL = 0.25
export const T_MAX = 4
export const PITCH_RATE = 1
export const THROTTLE_RATE = 0.5
export const CRUISE = 40
// 90 seconds of fuel at full throttle.
export const BURN = 1 / 90

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const isStalled = alpha => Math.abs(alpha) > ALPHA_STALL
// Past the critical angle the wing keeps only 30% of its peak lift.
export const cl = alpha => isStalled(alpha) ? Math.sign(alpha) * CLA * ALPHA_STALL * 0.3 : CLA * alpha
export const cd = alpha => CD0 + CDI * cl(alpha) ** 2

export function trim(v) {
  let alpha = 0, thrust = 0
  for (let i = 0; i < 50; i++) {
    thrust = K * cd(alpha) * v * v / Math.cos(alpha)
    alpha = (G - thrust * Math.sin(alpha)) / (K * CLA * v * v)
  }
  return { pitch: alpha, throttle: thrust / T_MAX }
}

export function makeLevel(seed, { gates = 12, spacing = 10, gateSpacing = 250, firstGate = 300, gap = 30 } = {}) {
  const rng = mulberry32(seed)
  const length = firstGate + gateSpacing * gates + 300
  const waves = [0, 1, 2].map(i => ({ amp: 5 + rng() * 7, freq: (0.004 + rng() * 0.004) * (i + 1), phase: rng() * Math.PI * 2 }))
  const terrain = Array.from({ length: Math.ceil(length / spacing) + 1 }, (_, i) =>
    40 + waves.reduce((h, w) => h + w.amp * Math.sin(w.freq * i * spacing + w.phase), 0))
  const level = { seed, spacing, terrain, gates: [] }
  for (let i = 0; i < gates; i++) {
    const x = firstGate + i * gateSpacing
    const ground = Math.max(...[-30, 0, 30].map(d => terrainAt(level, x + d)))
    level.gates.push({ x, y: ground + gap / 2 + 20 + rng() * 60, gap })
  }
  // Constant horizontal wind in m/s, positive = tailwind. Drawn last so the
  // terrain and gate layout stay identical to earlier levels for the same seed.
  level.wind = -12 + rng() * 24
  return level
}

export function terrainAt({ spacing, terrain }, x) {
  const f = Math.min(Math.max(x / spacing, 0), terrain.length - 1)
  const i = Math.min(Math.floor(f), terrain.length - 2)
  return terrain[i] + (terrain[i + 1] - terrain[i]) * (f - i)
}

export function initialState(level, { x = 0, y = 120, speed = CRUISE } = {}) {
  const { pitch, throttle } = trim(speed)
  // `speed` is the trim airspeed; with wind the ground velocity differs.
  const wind = level.wind ?? 0
  return { level, t: 0, x, y, vx: speed + wind, vy: 0, pitch, throttle, fuel: 1, stalled: false, score: 0, next: 0, results: [], status: 'flying' }
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

export function forces({ vx, vy, pitch, throttle, fuel = 1, level }) {
  const wind = level?.wind ?? 0
  // Lift and drag see the airspeed; position integrates ground velocity.
  const axAir = vx - wind, ayAir = vy
  const v = Math.hypot(axAir, ayAir)
  const alpha = Math.atan2(Math.sin(pitch - Math.atan2(ayAir, axAir)), Math.cos(pitch - Math.atan2(ayAir, axAir)))
  const q = K * v * v
  const lift = q * cl(alpha), drag = q * cd(alpha)
  const thrust = fuel > 0 ? throttle * T_MAX : 0
  const ux = v ? axAir / v : 0, uy = v ? ayAir / v : 0
  return {
    alpha, lift,
    ax: thrust * Math.cos(pitch) - drag * ux - lift * uy,
    ay: thrust * Math.sin(pitch) - drag * uy + lift * ux - G,
  }
}

// input: { pitch: -1|0|1, throttle: -1|0|1 }
export function step(state, input, dt) {
  if (state.status !== 'flying') return state
  const pitch = state.pitch + (input.pitch || 0) * PITCH_RATE * dt
  const throttle = clamp(state.throttle + (input.throttle || 0) * THROTTLE_RATE * dt, 0, 1)
  const fuel = clamp((state.fuel ?? 1) - throttle * BURN * dt, 0, 1)
  const { ax, ay, alpha } = forces({ ...state, pitch, throttle, fuel })
  const vx = state.vx + ax * dt, vy = state.vy + ay * dt
  const x = state.x + vx * dt, y = state.y + vy * dt
  const s = { ...state, t: state.t + dt, x, y, vx, vy, pitch, throttle, fuel, stalled: isStalled(alpha) }
  const gate = s.level.gates[s.next]
  if (gate && state.x < gate.x && x >= gate.x) {
    const gy = state.y + (y - state.y) * (gate.x - state.x) / (x - state.x)
    const hit = Math.abs(gy - gate.y) <= gate.gap / 2
    s.results = [...s.results, hit]
    s.score += hit
    s.next++
    if (s.next === s.level.gates.length) s.status = 'finished'
  }
  if (y <= terrainAt(s.level, x)) s.status = 'crashed'
  return s
}

// Each per-step input is one of 9 combinations of pitch/throttle in {-1, 0, 1}.
const CODE = input => (clamp(input.pitch || 0, -1, 1) + 1) * 3 + (clamp(input.throttle || 0, -1, 1) + 1)
const INPUT = code => ({ pitch: Math.floor(code / 3) - 1, throttle: (code % 3) - 1 })

// URL-safe run-length encoding: `<seed base36>_<code><count base36>_...`.
export function encodeRun(seed, inputs) {
  let out = (seed >>> 0).toString(36) + '_'
  for (let i = 0; i < inputs.length;) {
    const code = CODE(inputs[i])
    let j = i + 1
    while (j < inputs.length && CODE(inputs[j]) === code) j++
    out += code.toString(36) + (j - i).toString(36) + '_'
    i = j
  }
  return out
}

export function decodeRun(str) {
  if (typeof str !== 'string') throw new Error(`bad run ${str}`)
  const parts = str.split('_')
  if (!/^[0-9a-z]+$/i.test(parts[0])) throw new Error(`bad run ${str}`)
  const seed = parseInt(parts[0], 36)
  if (!Number.isInteger(seed) || seed < 0) throw new Error(`bad run ${str}`)
  const inputs = []
  for (const part of parts.slice(1)) {
    if (!part) continue
    const code = parseInt(part[0], 36), count = parseInt(part.slice(1), 36)
    if (!Number.isInteger(code) || code < 0 || code > 8 || !Number.isInteger(count) || count < 1) throw new Error(`bad run ${str}`)
    for (let i = 0; i < count; i++) inputs.push(INPUT(code))
  }
  return { seed, inputs }
}

export function replay(seed, inputs, dt) {
  return inputs.reduce((state, input) => step(state, input, dt), initialState(makeLevel(seed)))
}
