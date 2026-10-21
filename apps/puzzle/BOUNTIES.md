# Puzzle bounties

Each task is independent. Its checker is `bounties/<slug>/check.yml`: the
exact tests in that folder plus every existing test (`CHECKS=bounties/<slug> npm test`),
then a judge agent that writes its own browser tests from the instruction without
seeing the patch. A claim pays when `node check.mjs bounties/<slug>/check.yml <patch>`
passes in the dev image.

## 1. Deadlock detection for boxes stuck in corners

A box pushed into a corner that is not a goal can never move again, and the
player only finds out much later. Add `deadBoxes(state)` to `logic.js`, returning
the sorted indices of boxes that sit on a non-goal cell with a wall on one
vertical side and one horizontal side. The UI marks those cells with a `dead`
class and shows "Stuck: a box is in a corner" in `#status`.

Acceptance tests (`test/deadlock.test.js`):
- `deadBoxes returns [] for every level's start`: `deadBoxes(parse(lv.map))` deep-equals `[]` for each entry in `levels.json`.
- `corner box is dead`: `deadBoxes(play(parse(levels[1].map), 'DLdR'))` (level "Corner") deep-equals `[28]`.
- `dead box in a larger level`: `deadBoxes(play(parse(levels[4].map), 'URurDD'))` (level "Storeroom") deep-equals `[33]`.
- `box on a goal in a corner is not dead`: `deadBoxes(parse(['####', '#@*#', '####']))` deep-equals `[]`.
- `wall on one side only is not dead`: `deadBoxes(parse(['######', '#@$ .#', '#    #', '######']))` deep-equals `[]`.
- Playwright `marks dead box`: select option value `1` ("Corner"), press `ArrowDown`, `ArrowLeft`, `ArrowDown`, `ArrowRight`; assert `#board .dead` has count 1, it is the 29th `.cell` (index 28), and `#status` contains `Stuck`. Then click `undo` and assert `#board .dead` has count 0.

## 2. Persist progress and best scores per level

Players lose their place on reload. Store, per level name, whether it was solved
and the fewest moves used, and restore the last selected level on load. Keep the
bookkeeping pure in `logic.js` as `recordWin(progress, levelName, moves)` returning
a new progress object; `ui.js` reads and writes it under the `localStorage` key
`puzzle-progress`. The level `<select>` shows a check mark and the best move count
for solved levels.

Acceptance tests (`test/progress.test.js` and `test/progress.spec.js`):
- `recordWin stores first result`: `recordWin({}, 'Corner', 12)` deep-equals `{ Corner: { best: 12 } }`.
- `recordWin keeps the lower count`: `recordWin({ Corner: { best: 12 } }, 'Corner', 20).Corner.best === 12` and with `9` it is `9`.
- `recordWin does not mutate input`: the argument object is unchanged after the call.
- Playwright `best score survives reload`: solve level 1 with `ArrowRight` x3, reload, assert the option with value `0` contains `3` and a check mark (`✓`).
- Playwright `last level is restored`: select option value `2`, reload, assert `#level` has value `2` and `#moves` is `0`.

## 3. Shareable replay links

Let a player share a solution as a URL such as `/apps/puzzle/#level=2&moves=lLLLrrrddLLL`.
On load, the page selects that level and replays the moves; the replay must stop
with an error message in `#status` if a move is blocked. Add `replayUrl(levelIndex, state)`
and `parseReplay(hash)` to `logic.js`, and a "Copy link" button with
`data-testid="share"` that writes the URL to `#share-url` (a read-only input).

Acceptance tests (`test/replay.test.js` and `test/replay.spec.js`):
- `parseReplay round-trips`: `parseReplay('#level=2&moves=lLLLrrrddLLL')` deep-equals `{ level: 2, moves: 'lLLLrrrddLLL' }`.
- `replayUrl encodes history`: `replayUrl(0, play(parse(levels[0].map), 'rRR'))` equals `'#level=0&moves=rRR'`.
- `parseReplay rejects junk`: `parseReplay('#level=x&moves=q')` throws.
- Playwright `replay link solves a level`: goto `/apps/puzzle/#level=2&moves=lLLLrrrddLLL`, assert `#level` value `2`, `#moves` text `12`, `#status` contains `Solved`.
- Playwright `blocked replay reports the step`: goto `/apps/puzzle/#level=0&moves=l`, assert `#status` contains `blocked` and `#moves` is `0`.
