import assert from 'node:assert/strict'
import test from 'node:test'
import { publishRegistryRelease } from './publish-registry-release.mjs'

const version = '0.1.0-beta.4'
const npmTag = 'beta'
const expectedGitHead = '9e3cfdb9e443a03a0afd8cc2201c16259f7054e3'

function result(status, stdout = '', stderr = '') {
  return { status, stdout, stderr }
}

test('skips publish only after an existing immutable release passes strict verification', async () => {
  const calls = []
  const outcome = await publishRegistryRelease({
    version,
    npmTag,
    expectedGitHead,
    run(command, arguments_) {
      calls.push([command, arguments_])
      return calls.length === 1 ? result(0, JSON.stringify(version)) : result(0)
    },
  })

  assert.deepEqual(outcome, { published: false })
  assert.equal(calls.length, 2)
  assert.equal(calls.some(([, arguments_]) => arguments_[0] === 'publish'), false)
  assert.deepEqual(calls[1][1], ['run', 'verify:registry-release', '--', '--version', version])
})

test('accepts the npm 12 single-result version array', async () => {
  const calls = []
  const outcome = await publishRegistryRelease({
    version,
    npmTag,
    expectedGitHead,
    run(command, arguments_) {
      calls.push([command, arguments_])
      return calls.length === 1 ? result(0, JSON.stringify([version])) : result(0)
    },
  })

  assert.deepEqual(outcome, { published: false })
  assert.equal(calls.length, 2)
  assert.equal(calls.some(([, arguments_]) => arguments_[0] === 'publish'), false)
})

test('retries strict verification while a newly published release propagates', async () => {
  const calls = []
  let verificationAttempts = 0
  const outcome = await publishRegistryRelease({
    version,
    npmTag,
    expectedGitHead,
    attempts: 3,
    delayMs: 0,
    run(command, arguments_) {
      calls.push([command, arguments_])
      if (arguments_[0] === 'view') return result(1, '', 'npm error code E404')
      if (arguments_[0] === 'publish') return result(0)
      verificationAttempts += 1
      return verificationAttempts === 1 ? result(1, '', 'npm error code E404') : result(0)
    },
    sleep: async () => {},
    log() {},
  })

  assert.deepEqual(outcome, { published: true })
  assert.equal(calls.filter(([, arguments_]) => arguments_[0] === 'publish').length, 1)
  assert.equal(verificationAttempts, 2)
})

test('accepts a matching release that appears after an immutable publish conflict', async () => {
  let verificationAttempts = 0
  const outcome = await publishRegistryRelease({
    version,
    npmTag,
    expectedGitHead,
    attempts: 2,
    delayMs: 0,
    run(_command, arguments_) {
      if (arguments_[0] === 'view') return result(1, '', 'npm error code E404')
      if (arguments_[0] === 'publish') return result(1, '', 'npm error code E403 immutable version already exists')
      verificationAttempts += 1
      return verificationAttempts === 1 ? result(1, '', 'npm error code E404') : result(0)
    },
    sleep: async () => {},
    log() {},
  })

  assert.deepEqual(outcome, { published: false })
  assert.equal(verificationAttempts, 2)
})

test('does not publish or retry when an existing release fails strict verification', async () => {
  let calls = 0
  await assert.rejects(
    publishRegistryRelease({
      version,
      npmTag,
      expectedGitHead,
      run(_command, arguments_) {
        calls += 1
        return arguments_[0] === 'view' ? result(0, JSON.stringify(version)) : result(1, '', 'gitHead mismatch')
      },
    }),
    /gitHead mismatch/,
  )
  assert.equal(calls, 2)
})

test('does not publish when the registry lookup fails for a reason other than absence', async () => {
  let calls = 0
  await assert.rejects(
    publishRegistryRelease({
      version,
      npmTag,
      expectedGitHead,
      run() {
        calls += 1
        return result(1, '', 'npm error code E401')
      },
    }),
    /E401/,
  )
  assert.equal(calls, 1)
})
