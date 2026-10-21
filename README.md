# bounty-arcade

Four small browser apps developed through self-claiming coding bounties.
Live gallery: https://amiller.github.io/bounty-arcade/

| App | What it is |
|---|---|
| [flight](apps/flight/) | Canvas plane game: gates, seeded terrain, lift/drag/stall model |
| [puzzle](apps/puzzle/) | Sokoban with six levels, undo and move counts |
| [routes](apps/routes/) | GPX viewer: track map, elevation profile, stats |
| [board](apps/board/) | Kanban board stored in IndexedDB, with export/import |

No dependencies or build step: each app is plain HTML and ES modules, with its
logic in a pure `logic.js` and tests in `test/`.

## Bounties

Open bounties are issues labelled `bounty`; each app's `BOUNTIES.md` lists them.
The checker is public: a bounty pays when `npm test` passes in the dev image at
the stated base commit, with that bounty's acceptance tests added. Nobody
reviews or approves the result.

## Running

```sh
node serve.mjs                  # http://localhost:8080
node --test apps/*/test/*.test.js
docker compose run --rm check   # full check, including Chromium tests
```
