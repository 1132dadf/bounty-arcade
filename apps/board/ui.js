import { COLUMNS, applyAction, emptyBoard, neighbour, createHistory, record, undo, redo, filterBoard } from './logic.js'

const $ = id => document.getElementById(id)
function el(tag, { dataset = {}, ...props } = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props)
  Object.assign(node.dataset, dataset)
  node.append(...kids)
  return node
}

const req = r => new Promise((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error) })
const db = await new Promise((ok, fail) => {
  const r = indexedDB.open('bounty-arcade-board', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('kv')
  r.onsuccess = () => ok(r.result)
  r.onerror = () => fail(r.error)
})
const store = mode => db.transaction('kv', mode).objectStore('kv')

let board = (await req(store('readonly').get('board'))) ?? emptyBoard()
let history = createHistory(board)
let editing = null
let saves = 0
let query = ''

async function save() {
  const tx = db.transaction('kv', 'readwrite')
  tx.objectStore('kv').put(board, 'board')
  await new Promise((ok, fail) => { tx.oncomplete = ok; tx.onerror = () => fail(tx.error) })
  $('board').dataset.saved = ++saves
}

async function dispatch(action) {
  history = record(history, action)
  board = history.present
  render()
  return save()
}

async function doUndo() {
  history = undo(history)
  board = history.present
  render()
  return save()
}

async function doRedo() {
  history = redo(history)
  board = history.present
  render()
  return save()
}

const fail = err => { $('status').textContent = err.message }
const run = action => dispatch(action).catch(fail)

function doingFull() {
  const limit = board.limits?.doing
  return limit !== undefined && board.columns.doing.length >= limit
}

function cardView(col, card, index, count, visible) {
  const full = doingFull()
  const btn = (label, action, onclick, disabled = false) => el('button', { textContent: label, title: action, onclick, disabled, type: 'button', dataset: { action } })
  const li = el('li', { className: 'card', draggable: true, dataset: { testid: 'card', id: card.id } })
  li.hidden = !visible.includes(card.id)
  li.ondragstart = e => e.dataTransfer.setData('text/plain', card.id)
  if (editing === card.id) {
    const input = el('input', { value: card.text, dataset: { testid: 'edit-input' } })
    const commit = () => { editing = null; input.value.trim() ? run({ type: 'edit', id: card.id, text: input.value }) : render() }
    input.onkeydown = e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { editing = null; render() } }
    input.onblur = () => editing === card.id && commit()
    li.append(input)
    queueMicrotask(() => input.focus())
  } else li.append(el('p', { textContent: card.text }))
  const left = neighbour(col, -1), right = neighbour(col, 1)
  li.append(el('div', { className: 'tools' },
    btn('←', 'left', () => run({ type: 'move', id: card.id, to: left }), !left || (col === 'done' && full)),
    btn('↑', 'up', () => run({ type: 'move', id: card.id, to: col, index: index - 1 }), index === 0),
    btn('↓', 'down', () => run({ type: 'move', id: card.id, to: col, index: index + 1 }), index === count - 1),
    btn('→', 'right', () => run({ type: 'move', id: card.id, to: right }), !right || (col === 'todo' && full)),
    btn('Edit', 'edit', () => { editing = card.id; render() }),
    btn('Delete', 'delete', () => run({ type: 'delete', id: card.id })),
  ))
  return li
}

function columnView([col, title], visible) {
  const cards = board.columns[col]
  const full = col === 'doing' && doingFull()
  const input = el('input', { placeholder: 'Add a card', required: true, pattern: '.*\\S.*', dataset: { testid: `new-${col}` } })
  input.disabled = full
  const form = el('form', { onsubmit: e => { e.preventDefault(); run({ type: 'add', column: col, text: input.value }) } },
    input, el('button', { textContent: 'Add', disabled: full, dataset: { testid: `add-${col}` } }))
  const active = query.trim() !== ''
  const section = el('section', { className: 'column', dataset: { testid: `column-${col}`, column: col } },
    el('h2', {}, title, el('span', { textContent: active ? `${visible[col].length}/${cards.length}` : String(cards.length) })),
    el('ol', {}, ...cards.map((card, i) => cardView(col, card, i, cards.length, visible[col]))),
    form)
  section.ondragover = e => { e.preventDefault(); section.classList.add('over') }
  section.ondragleave = () => section.classList.remove('over')
  section.ondrop = e => {
    e.preventDefault()
    if (col === 'doing' && doingFull()) return
    run({ type: 'move', id: e.dataTransfer.getData('text/plain'), to: col })
  }
  return section
}

function render() {
  const focused = document.activeElement?.dataset?.testid
  const visible = filterBoard(board, query)
  $('board').replaceChildren(...COLUMNS.map(col => columnView(col, visible)))
  $('undo').disabled = history.past.length === 0
  $('redo').disabled = history.future.length === 0
  const limit = board.limits?.doing
  $('limit-doing').value = limit === undefined ? '' : String(limit)
  if (focused?.startsWith('new-')) document.querySelector(`[data-testid="${focused}"]`)?.focus()
}

$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' }))
  el('a', { href: url, download: 'board.json' }).click()
  URL.revokeObjectURL(url)
}

$('import').onchange = async e => {
  const file = e.target.files[0]
  e.target.value = ''
  try {
    await dispatch({ type: 'import', board: JSON.parse(await file.text()) })
    $('status').textContent = ''
  } catch (err) {
    $('status').textContent = `Import failed: ${err.message}`
  }
}

$('undo').addEventListener('click', () => doUndo().catch(fail))
$('redo').addEventListener('click', () => doRedo().catch(fail))
$('search').addEventListener('input', () => { query = $('search').value; render() })
$('limit-doing').addEventListener('input', () => {
  const raw = $('limit-doing').value.trim()
  if (raw === '') return run({ type: 'setLimit', column: 'doing', limit: null })
  const limit = Number(raw)
  if (Number.isInteger(limit) && limit > 0) run({ type: 'setLimit', column: 'doing', limit })
})
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
  if (e.target instanceof Element && e.target.closest('input, textarea, select')) return
  e.preventDefault()
  ;(e.shiftKey ? doRedo() : doUndo()).catch(fail)
})

render()
$('board').dataset.ready = 'true'
