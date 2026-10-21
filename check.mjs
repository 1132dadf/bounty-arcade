// Runs a bounty checker: node check.mjs bounties/<name>/check.yml <candidate.patch>
import { execSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

const [checkFile, patchFile] = process.argv.slice(2).map(p => resolve(p))
const check = parse(readFileSync(checkFile, 'utf8'))
const repo = new URL('.', import.meta.url).pathname
const sh = (cmd, cwd, env = {}) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } })
const passes = (cmd, cwd, env) => { try { sh(cmd, cwd, env); return true } catch { return false } }

function tree(withPatch) {
  const dir = mkdtempSync(join(tmpdir(), 'bounty-'))
  sh(`git -C ${repo} archive ${check.base} | tar -x -C ${dir}`)
  symlinkSync(join(repo, 'node_modules'), join(dir, 'node_modules'))
  cpSync(join(repo, 'bounties'), join(dir, 'bounties'), { recursive: true })
  if (withPatch) sh(`git apply ${patchFile}`, dir)
  return dir
}

const judgePrompt = (agent, i) => `You are writing the acceptance tests for a coding bounty in this repository (${check.app}).
The feature below is NOT implemented here, and you must not implement it.
Write tests into _checks/${i}/ that pass only once it is implemented as described:
node:test files named *.test.js (run with: CHECKS=_checks/${i} npm run test:logic) and${agent.browser ? ' Playwright specs named *.spec.js against relative URLs (run with: CHECKS=_checks/' + i + ' npx playwright test); headless Chromium is available, so drive the page the way the instruction says' : ' no browser specs'}.
Import app code with paths relative to _checks/${i}/. Run your tests and confirm they FAIL here, because the feature is missing.

Feature:
${agent.instruction}`

const candidate = tree(true)
let ok = true
for (const step of check.steps) {
  if (step.run) {
    ok = passes(step.run, candidate)
    console.log(`run: ${step.run} -> ${ok ? 'pass' : 'FAIL'}`)
  } else {
    if (!process.env.BOUNTY_IMAGE) throw new Error('agent steps run only inside the dev image (BOUNTY_IMAGE unset)')
    const a = step.agent
    let passed = 0
    for (let i = 0; i < a.runs; i++) {
      const judge = tree(false)
      execSync(`claude -p --model ${a.model} --allowedTools Bash,Read,Write,Edit --max-turns ${a.max_turns}`,
        { cwd: judge, input: judgePrompt(a, i), stdio: ['pipe', 'inherit', 'inherit'] })
      const checks = `_checks/${i}`
      const failsOnBase = !passes('npm test', judge, { CHECKS: checks })
      cpSync(join(judge, checks), join(candidate, checks), { recursive: true })
      const passesOnCandidate = passes('npm test', candidate, { CHECKS: checks })
      console.log(`agent run ${i}: fails on base ${failsOnBase}, passes on candidate ${passesOnCandidate}`)
      if (failsOnBase && passesOnCandidate) passed++
    }
    ok = passed >= a.pass
    console.log(`agent: ${passed}/${a.runs} runs passed, need ${a.pass} -> ${ok ? 'pass' : 'FAIL'}`)
  }
  if (!ok) break
}
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
