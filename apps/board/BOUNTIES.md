# Board bounties

Each task is independent. Its checker is `bounties/<slug>/check.yml`: the
exact tests in that folder plus every existing test (`CHECKS=bounties/<slug> npm test`),
then a judge agent that writes its own browser tests from the instruction without
seeing the patch. A claim pays when `node check.mjs bounties/<slug>/check.yml <patch>`
passes in the dev image.

## 1. Search cards

Add a search box above the board that hides cards whose text does not contain
the query, case-insensitively, across all columns. Column counts show
`matching/total` while a query is active and the plain total otherwise. Filtering
is view state only: it never changes the stored board or the export.

Acceptance tests:

- `test/search.test.js` imports `filterBoard(board, query)` from `logic.js`.
  - `filterBoard returns matching cards per column`: on a board with `Fix login`
    (todo), `login page copy` (doing) and `Ship` (done), query `LOGIN` returns
    `{ todo: ['c1'], doing: ['c2'], done: [] }` (card ids per column, in order).
  - `blank query matches everything`: `''` and `'   '` return every card id.
  - `filterBoard does not mutate the board`: board deep-equals a
    `structuredClone` taken before the call.
- `test/search.spec.js`: add `alpha` and `beta` to To do, type `alp` into
  `[data-testid=search]`; expect one visible `[data-testid=card]` with text
  `alpha` and the To do heading's count (`h2 span`) to read `1/2`. Clear the
  box; expect two visible cards and the count `2`. Type `alp` again and
  reload; expect the box empty and two visible cards.

## 2. Undo and redo

Add Undo and Redo buttons (`data-testid=undo`, `data-testid=redo`) and the
shortcuts Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. History holds at most 50 past
states, is cleared by import, and is not persisted. A new action after an undo
discards the redo stack. Buttons are disabled when there is nothing to undo or
redo.

Acceptance tests:

- `test/history.test.js` imports `createHistory(board)`, `record(h, action)`,
  `undo(h)`, `redo(h)` from `logic.js`, each returning a new history
  `{ past, present, future }`.
  - `undo restores the previous board and redo reapplies it`: add `a`, add `b`,
    undo: `present.columns.todo` texts are `['a']`; redo: `['a', 'b']`.
  - `recording after undo clears future`: add `a`, undo, add `c`:
    `future` is `[]` and `present` has only `c`.
  - `history is capped at 50`: 60 adds leave `past.length === 50`; 50 undos
    reach a board with 10 cards; a 51st `undo` throws `/nothing to undo/`.
  - `import clears history`: `record(h, { type: 'import', board })` yields
    `past.length === 0`.
- `test/history.spec.js`: add a card, move it right, click undo; the card is in
  To do and `[data-testid=redo]` is enabled. Press Control+Shift+Z; the card is
  in Doing and the board's `data-saved` reaches `4` (undo and redo are stored
  like any change). Reload; `[data-testid=undo]` is disabled and the card is in
  Doing.

## 3. Work-in-progress limit on Doing

Let the user set a limit on the Doing column with a number input
(`data-testid=limit-doing`, empty means no limit). Adding or moving a card into
a full Doing column is rejected by the reducer, and the UI disables those
controls. The limit is stored on the board as optional `limits: { doing: n }`,
persists across reload and survives export/import. Boards exported before this
change still import.

Acceptance tests:

- `test/limits.test.js`:
  - `setLimit stores the limit`: `applyAction(b, { type: 'setLimit', column:
    'doing', limit: 2 }).limits` deep-equals `{ doing: 2 }`; `limit: null`
    removes the `limits` key, giving back a board deep-equal to one that never
    had a limit.
  - `add and move into a full column throw`: with limit 1 and one card in
    Doing, both `{ type: 'add', column: 'doing' }` and a `move` from To do to
    Doing throw `/WIP limit/`; reordering inside Doing still works.
  - `lowering the limit below the current count throws`: two cards in Doing,
    `setLimit` to 1 throws `/WIP limit/`.
  - `validate accepts old and new boards`: a board without `limits` passes;
    `limits: { doing: 0 }`, `{ doing: 1.5 }`, `{ todo: 2 }` and a board whose
    Doing already exceeds its limit each throw `/invalid board/`.
  - `limits survive export and import`: a board with `limits: { doing: 3 }`
    imported from its JSON deep-equals the original.
- `test/limits.spec.js`: set `[data-testid=limit-doing]` to `1`, add two cards
  to To do, move the first right; the second card's `[data-action=right]`
  button is disabled and the board's `data-saved` reaches `4` (setting the limit
  is stored like any change). Reload; the input still shows `1` and the button
  is still disabled.
