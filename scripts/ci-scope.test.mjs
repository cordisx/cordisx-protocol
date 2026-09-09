import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/check.yml', import.meta.url), 'utf8')
const block = workflow.split('        run: |\n')[1].split('      - name: Check scope regression cases')[0]
const script = block.split('\n').map(line => line.replace(/^          /, '')).join('\n')
const sensitive = 'types/example.ts'

function classify(mode, filename = 'README.md') {
  const cwd = mkdtempSync(path.join(tmpdir(), 'ci-scope-'))
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  function write(file, content) {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true })
    writeFileSync(path.join(cwd, file), content)
  }
  try {
    git('init', '--quiet')
    git('config', 'user.name', 'CI scope test')
    git('config', 'user.email', 'ci@example.invalid')
    write(sensitive, 'export {}\n')
    write('README.md', '# Base\n')
    git('add', '.')
    git('commit', '--quiet', '-m', 'base')
    const base = git('rev-parse', 'HEAD')
    if (mode === 'delete') git('rm', '--quiet', '--', sensitive)
    if (mode === 'rename') git('mv', '--', sensitive, 'moved.md')
    if (mode !== 'empty') {
      write(filename, '# Changed\n')
      git('add', '.')
      git('commit', '--quiet', '-m', 'change')
    }
    const output = path.join(cwd, 'output')
    execFileSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
      cwd,
      env: {
        ...process.env,
        BASE_SHA: base,
        HEAD_SHA: git('rev-parse', 'HEAD'),
        RUNNER_TEMP: cwd,
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: path.join(cwd, 'summary'),
      },
    })
    return Object.fromEntries(readFileSync(output, 'utf8').trim().split('\n').map(line => line.split('=')))
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

for (const mode of ['delete', 'rename', 'empty']) {
  test(`${mode} cannot downgrade a sensitive diff to documentation`, () => {
    assert.equal(classify(mode).docs_only, 'false')
  })
}

test('ordinary README remains lightweight', () => {
  assert.equal(classify('edit').docs_only, 'true')
})

test('guide classification respects owner semantics and unusual filenames', () => {
  assert.equal(classify('edit', '.agents/docs/two words\nexample.md').docs_only, 'false')
})

test('maintenance rules retain complete validation', () => {
  assert.equal(classify('edit', '.agents/rules/README.md').docs_only, 'false')
})

test('scope failure cannot skip the complete gate', () => {
  assert.ok(workflow.includes("needs.scope.result != 'success'"))
})
