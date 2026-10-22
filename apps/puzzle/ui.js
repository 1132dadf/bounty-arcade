import { parse, move, undo, isWon, moves, pushes, interior, deadBoxes, recordWin, replayUrl, parseReplay } from './logic.js'

const $ = id => document.getElementById(id)
const board = $('board'), select = $('level')
const keys = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r' }
let state, inside
let progress = {}
try { progress = JSON.parse(localStorage.getItem('puzzle-progress')) ?? {} } catch { progress = {} }

// Keys pressed before levels.json has loaded are queued so the first move is
// never dropped while the module is still awaiting the fetch.
let ready = false
const pendingKeys = []
document.addEventListener('keydown', e => {
  if (!ready) { pendingKeys.push(e); return }
  onKey(e)
})

const levels = await (await fetch('levels.json')).json()

function levelLabel(i) {
  const best = progress[levels[i].name]?.best
  return `${i + 1}. ${levels[i].name}${best === undefined ? '' : ` ✓ ${best}`}`
}

function renderLevels() {
  const current = select.value
  select.replaceChildren(...levels.map((lv, i) => new Option(levelLabel(i), i)))
  if (current !== '') select.value = current
}

function selected() { return Number(select.value) }

function load(i) {
  select.value = i
  state = parse(levels[i].map)
  inside = interior(state)
  board.style.gridTemplateColumns = `repeat(${state.w}, var(--size))`
  board.style.setProperty('--size', `min(2.5rem, ${88 / state.w}vw)`)
  draw()
}

function draw() {
  const dead = deadBoxes(state)
  board.replaceChildren(...Array.from({ length: state.w * state.h }, (_, i) => {
    const c = document.createElement('div')
    c.className = 'cell ' + (state.walls.has(i) ? 'wall' : inside.has(i) ? 'floor' : 'outside')
    if (state.goals.has(i)) c.classList.add('goal')
    if (state.boxes.includes(i)) c.classList.add('box')
    if (i === state.player) c.classList.add('player')
    if (dead.includes(i)) c.classList.add('dead')
    return c
  }))
  $('moves').textContent = moves(state)
  $('pushes').textContent = pushes(state)
  if (isWon(state)) {
    const i = selected()
    progress = recordWin(progress, levels[i].name, moves(state))
    localStorage.setItem('puzzle-progress', JSON.stringify(progress))
    select.options[i].textContent = levelLabel(i)
    $('status').textContent = i === levels.length - 1 ? 'Solved! That was the last level.' : 'Solved! Press N for the next level.'
  } else if (dead.length) {
    $('status').textContent = 'Stuck: a box is in a corner'
  } else {
    $('status').textContent = ''
  }
}

function step(dir) {
  if (!state || isWon(state)) return
  state = move(state, dir)
  draw()
}

function onKey(e) {
  if (e.target === select || e.target.tagName === 'INPUT') return
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (keys[k]) step(keys[k])
  else if (k === 'z' || k === 'Backspace') { state = undo(state); draw() }
  else if (k === 'r') load(selected())
  else if (k === 'n' && isWon(state) && selected() < levels.length - 1) load(selected() + 1)
  else return
  e.preventDefault()
}

document.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => step(b.dataset.dir)))
$('undo').addEventListener('click', () => { if (state) { state = undo(state); draw() } })
$('restart').addEventListener('click', () => { if (state) load(selected()) })
select.addEventListener('change', () => {
  localStorage.setItem('puzzle-level', String(selected()))
  load(selected())
  select.blur()
})
$('share').addEventListener('click', () => {
  if (!state) return
  $('share-url').value = new URL(replayUrl(selected(), state), location.href).href
})

function applyReplay(history) {
  let blocked = null
  for (const c of history) {
    const next = move(state, c.toLowerCase())
    if (next === state) { blocked = c; break }
    state = next
  }
  draw()
  if (blocked) $('status').textContent = `Blocked: move '${blocked}' was blocked`
}

renderLevels()
const saved = Number(localStorage.getItem('puzzle-level'))
let start = Number.isInteger(saved) && saved >= 0 && saved < levels.length ? saved : 0
let replay = null
if (location.hash) {
  try { replay = parseReplay(location.hash) } catch (err) { console.error(err.message) }
}
if (replay) {
  if (!Number.isInteger(replay.level) || replay.level < 0 || replay.level >= levels.length) replay = null
  else start = replay.level
}
load(start)
if (replay) applyReplay(replay.moves)

ready = true
for (const e of pendingKeys.splice(0)) onKey(e)
