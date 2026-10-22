export const COLUMNS = [['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done']]
const IDS = COLUMNS.map(([id]) => id)

export const emptyBoard = () => ({ nextId: 1, columns: { todo: [], doing: [], done: [] } })

export function findCard(board, id) {
  for (const col of IDS) {
    const index = board.columns[col].findIndex(c => c.id === id)
    if (index >= 0) return { col, index, card: board.columns[col][index] }
  }
  throw new Error(`no card ${id}`)
}

function cleanText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('card text must be non-empty')
  return text.trim()
}

function column(id) {
  if (!IDS.includes(id)) throw new Error(`no column ${id}`)
  return id
}

const clone = board => ({
  nextId: board.nextId,
  columns: Object.fromEntries(IDS.map(c => [c, board.columns[c].map(card => ({ ...card }))])),
  ...(board.limits ? { limits: { ...board.limits } } : {}),
})

// The Doing column may be capped by the optional board.limits.doing value.
function assertRoom(board, col) {
  if (col !== 'doing') return
  const limit = board.limits?.doing
  if (limit !== undefined && board.columns.doing.length >= limit) throw new Error(`WIP limit: doing is full (${limit})`)
}

export function applyAction(board, action) {
  const next = clone(board)
  const cols = next.columns
  switch (action.type) {
    case 'add':
      assertRoom(next, column(action.column))
      cols[action.column].push({ id: `c${next.nextId++}`, text: cleanText(action.text) })
      return next
    case 'edit':
      findCard(next, action.id).card.text = cleanText(action.text)
      return next
    case 'delete': {
      const { col, index } = findCard(next, action.id)
      cols[col].splice(index, 1)
      return next
    }
    // index is the position in the target column after the card is removed from its source.
    case 'move': {
      const { col, index, card } = findCard(next, action.id)
      const to = column(action.to)
      if (to !== col) assertRoom(next, to)
      cols[col].splice(index, 1)
      const at = action.index ?? cols[to].length
      if (!Number.isInteger(at) || at < 0 || at > cols[to].length) throw new Error(`bad index ${at}`)
      cols[to].splice(at, 0, card)
      return next
    }
    case 'import':
      return clone(validate(action.board))
    case 'setLimit': {
      const col = column(action.column)
      if (col !== 'doing') throw new Error(`no WIP limit for ${col}`)
      if (action.limit === null || action.limit === undefined) {
        if (next.limits) {
          delete next.limits.doing
          if (!Object.keys(next.limits).length) delete next.limits
        }
        return next
      }
      if (!Number.isInteger(action.limit) || action.limit < 1) throw new Error(`WIP limit must be a positive integer: ${action.limit}`)
      if (cols.doing.length > action.limit) throw new Error(`WIP limit: doing has ${cols.doing.length} cards, limit ${action.limit}`)
      next.limits = { ...(next.limits ?? {}), doing: action.limit }
      return next
    }
    default:
      throw new Error(`unknown action ${action.type}`)
  }
}

// Column to the left/right of col (delta -1/+1), undefined at the edges.
export const neighbour = (col, delta) => IDS[IDS.indexOf(column(col)) + delta]

export function validate(board) {
  const fail = msg => { throw new Error(`invalid board: ${msg}`) }
  if (!board || typeof board !== 'object' || Array.isArray(board)) fail('not an object')
  if (!Number.isInteger(board.nextId) || board.nextId < 1) fail('nextId must be a positive integer')
  const cols = board.columns
  if (!cols || typeof cols !== 'object' || Object.keys(cols).sort().join() !== [...IDS].sort().join()) fail(`columns must be exactly ${IDS.join(', ')}`)
  const seen = new Set()
  for (const col of IDS) {
    if (!Array.isArray(cols[col])) fail(`column ${col} is not an array`)
    for (const card of cols[col]) {
      if (!card || typeof card !== 'object' || Object.keys(card).sort().join() !== 'id,text') fail('card must have exactly id and text')
      const m = /^c(\d+)$/.exec(card.id)
      if (!m || Number(m[1]) >= board.nextId) fail(`bad card id ${card.id}`)
      if (seen.has(card.id)) fail(`duplicate card id ${card.id}`)
      seen.add(card.id)
      if (typeof card.text !== 'string' || !card.text.trim()) fail(`card ${card.id} has empty text`)
    }
  }
  if (board.limits !== undefined) {
    const limits = board.limits
    if (!limits || typeof limits !== 'object' || Array.isArray(limits)) fail('limits must be an object')
    for (const [col, limit] of Object.entries(limits)) {
      if (col !== 'doing') fail(`unknown limit column ${col}`)
      if (!Number.isInteger(limit) || limit < 1) fail(`limit for ${col} must be a positive integer`)
      if (cols[col].length > limit) fail(`${col} has more cards than its limit`)
    }
  }
  return board
}

// Cards whose text contains the query, as ids per column; blank matches all.
export function filterBoard(board, query) {
  const q = String(query ?? '').trim().toLowerCase()
  return Object.fromEntries(IDS.map(col => [col,
    board.columns[col].filter(card => !q || card.text.toLowerCase().includes(q)).map(card => card.id)]))
}

export function createHistory(board) {
  return { past: [], present: board, future: [] }
}

export function record(history, action) {
  const present = applyAction(history.present, action)
  if (action.type === 'import') return { past: [], present, future: [] }
  return { past: [...history.past, history.present].slice(-50), present, future: [] }
}

export function undo(history) {
  if (!history.past.length) throw new Error('nothing to undo')
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1),
    future: [history.present, ...history.future],
  }
}

export function redo(history) {
  if (!history.future.length) throw new Error('nothing to redo')
  return {
    past: [...history.past, history.present].slice(-50),
    present: history.future[0],
    future: history.future.slice(1),
  }
}
