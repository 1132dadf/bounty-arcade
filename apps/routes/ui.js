import { parseGpx, stats, profile, project, profileCoords, formatKm, formatM, timing, formatDuration } from './logic.js'

const $ = id => document.getElementById(id)
const NS = 'http://www.w3.org/2000/svg'
const pts = xy => xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
let current = null

function el(name, attrs, text) {
  const e = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  if (text !== undefined) e.textContent = text
  return e
}

function drawTrack(segments) {
  const points = segments.flat()
  const xy = project(points, 600, 400, 20)
  const lines = []
  let at = 0
  for (const seg of segments) {
    lines.push(el('polyline', { points: pts(xy.slice(at, at + seg.length)) }))
    at += seg.length
  }
  $('track').replaceChildren(...lines,
    el('circle', { class: 'start', cx: xy[0][0], cy: xy[0][1], r: 6 }),
    el('circle', { class: 'end', cx: xy.at(-1)[0], cy: xy.at(-1)[1], r: 4 }),
  )
}

function drawProfile(points, s) {
  const svg = $('profile')
  if (s.minEle === null) return svg.replaceChildren(el('text', { class: 'axis', x: 300, y: 85, 'text-anchor': 'middle' }, 'No elevation data'))
  const prof = profile(points), xy = profileCoords(prof, 600, 160, 16)
  svg.replaceChildren(
    el('polygon', { points: pts([[xy[0][0], 144], ...xy, [xy.at(-1)[0], 144]]) }),
    el('polyline', { points: pts(xy) }),
    el('text', { class: 'axis', x: 18, y: 12 }, formatM(s.maxEle)),
    el('text', { class: 'axis', x: 18, y: 158 }, formatM(s.minEle)),
    el('text', { class: 'axis', x: 582, y: 158, 'text-anchor': 'end' }, formatKm(s.distance)),
  )
}

function renderStats() {
  const { points, segments } = current
  const raw = Number($('threshold').value)
  const threshold = Number.isFinite(raw) && raw > 0 ? raw : 0
  const s = stats(points, { segments, threshold })
  const t = timing(points)
  $('stat-distance').textContent = formatKm(s.distance)
  $('stat-gain').textContent = formatM(s.gain)
  $('stat-loss').textContent = formatM(s.loss)
  $('stat-min').textContent = formatM(s.minEle)
  $('stat-max').textContent = formatM(s.maxEle)
  $('stat-count').textContent = s.count
  $('stat-elapsed').textContent = formatDuration(t.elapsed)
  $('stat-moving').textContent = formatDuration(t.moving)
  drawProfile(points, s)
}

function show(text, label) {
  $('error').textContent = ''
  current = parseGpx(text)
  $('route-name').textContent = current.name ?? label
  renderStats()
  drawTrack(current.segments)
}

const report = e => { $('error').textContent = e.message; throw e }

async function loadSample() {
  const res = await fetch($('sample').value)
  if (!res.ok) throw new Error(`${res.status} fetching ${$('sample').value}`)
  show(await res.text(), $('sample').selectedOptions[0].text)
}

$('sample').addEventListener('change', () => loadSample().catch(report))
$('file').addEventListener('change', async () => {
  const f = $('file').files[0]
  await f.text().then(t => show(t, f.name.replace(/\.gpx$/i, ''))).catch(report)
})
$('threshold').addEventListener('input', () => { if (current) renderStats() })
loadSample().catch(report)
