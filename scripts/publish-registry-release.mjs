import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveRelease } from './resolve-release.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const registry = 'https://registry.npmjs.org'

function defaultRun(command, arguments_, options = {}) {
  return spawnSync(command, arguments_, { cwd: root, encoding: 'utf8', ...options })
}

function commandError(command, arguments_, result) {
  return new Error(`${command} ${arguments_.join(' ')} failed:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
}

function singleViewResult(value, label) {
  if (!Array.isArray(value)) return value
  if (value.length !== 1) throw new Error(`registry returned ${value.length} ${label} results`)
  return value[0]
}

export async function publishRegistryRelease({
  version,
  npmTag,
  expectedGitHead,
  attempts = 12,
  delayMs = 10_000,
  run = defaultRun,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  log = console.log,
}) {
  const packageName = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name
  const registryArgument = '--registry=' + registry
  const viewArguments = ['view', `${packageName}@${version}`, 'version', '--json', registryArgument]
  const view = run('npm', viewArguments)
  const missing = view.status !== 0 && /(?:E404|404 Not Found)/i.test(`${view.stdout ?? ''}\n${view.stderr ?? ''}`)
  const verifyArguments = ['run', 'verify:registry-release', '--', '--version', version]
  const verify = () => run('npm', verifyArguments, { env: { ...process.env, EXPECT_GIT_HEAD: expectedGitHead } })

  async function verifyWithRetry() {
    let failure
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const result = verify()
      if (result.status === 0) return
      failure = commandError('npm', verifyArguments, result)
      if (attempt < attempts) {
        log(`Registry verification attempt ${attempt}/${attempts} failed; retrying after ${delayMs}ms.`)
        await sleep(delayMs)
      }
    }
    throw failure
  }

  if (!missing) {
    if (view.status !== 0) throw commandError('npm', viewArguments, view)
    if (singleViewResult(JSON.parse(view.stdout), 'version') !== version) {
      throw new Error(`registry returned an unexpected version for ${packageName}@${version}`)
    }
    const verification = verify()
    if (verification.status !== 0) throw commandError('npm', verifyArguments, verification)
    log(`${packageName}@${version} already exists and matches the release; skipping npm publish.`)
    return { published: false }
  }

  const publishArguments = [
    'publish',
    '--provenance',
    '--access',
    'public',
    '--tag',
    npmTag,
    registryArgument,
  ]
  const publish = run('npm', publishArguments)
  if (publish.status !== 0) {
    try {
      await verifyWithRetry()
      log(`${packageName}@${version} became available after npm publish failed; the immutable release matches.`)
      return { published: false }
    } catch (verificationError) {
      throw new AggregateError(
        [commandError('npm', publishArguments, publish), verificationError],
        'npm publish failed and no matching immutable release became available',
      )
    }
  }

  await verifyWithRetry()
  return { published: true }
}

async function main() {
  const arguments_ = process.argv.slice(2)
  if (arguments_.length !== 4 || arguments_[0] !== '--version' || arguments_[2] !== '--tag') {
    throw new Error('usage: publish-registry-release.mjs --version <exact-version> --tag <npm-tag>')
  }
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const version = arguments_[1]
  const npmTag = arguments_[3]
  const release = resolveRelease('v' + version, manifest.version)
  if (npmTag !== release.npmTag) {
    throw new Error(`npm tag ${npmTag} does not match derived release tag ${release.npmTag}`)
  }
  const expectedGitHead = process.env.EXPECT_GIT_HEAD
  if (!expectedGitHead) throw new Error('EXPECT_GIT_HEAD is required')
  await publishRegistryRelease({ version, npmTag, expectedGitHead })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
