import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, play, replayUrl, parseReplay } from '../../apps/puzzle/logic.js'

const levels = JSON.parse(readFileSync(new URL('../../apps/puzzle/levels.json', import.meta.url)))

test('parseReplay round-trips', () => {
  assert.deepEqual(parseReplay('#level=2&moves=lLLLrrrddLLL'), { level: 2, moves: 'lLLLrrrddLLL' })
})

test('replayUrl encodes history', () => {
  assert.equal(replayUrl(0, play(parse(levels[0].map), 'rRR')), '#level=0&moves=rRR')
})

test('parseReplay rejects junk', () => {
  assert.throws(() => parseReplay('#level=x&moves=q'))
})
