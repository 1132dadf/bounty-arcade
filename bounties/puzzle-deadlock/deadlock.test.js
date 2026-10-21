import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, play, deadBoxes } from '../../apps/puzzle/logic.js'

const levels = JSON.parse(readFileSync(new URL('../../apps/puzzle/levels.json', import.meta.url)))

test('deadBoxes returns [] for every level\'s start', () => {
  for (const lv of levels) assert.deepEqual(deadBoxes(parse(lv.map)), [], lv.name)
})

test('corner box is dead', () => {
  assert.deepEqual(deadBoxes(play(parse(levels[1].map), 'DLdR')), [28])
})

test('dead box in a larger level', () => {
  assert.deepEqual(deadBoxes(play(parse(levels[4].map), 'URurDD')), [33])
})

test('box on a goal in a corner is not dead', () => {
  assert.deepEqual(deadBoxes(parse(['####', '#@*#', '####'])), [])
})

test('wall on one side only is not dead', () => {
  assert.deepEqual(deadBoxes(parse(['######', '#@$ .#', '#    #', '######'])), [])
})
