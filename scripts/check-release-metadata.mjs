import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRelease } from './resolve-release.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))

if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org' || manifest.publishConfig?.access !== 'public') {
  throw new Error('release metadata registry or access drifted')
}
if (Object.hasOwn(manifest.publishConfig ?? {}, 'tag')) {
  throw new Error('publishConfig must not pin a release channel')
}
if (lock.version !== manifest.version || lock.packages?.['']?.version !== manifest.version) {
  throw new Error('package and lockfile versions drifted')
}

const validCases = [
  ['v1.2.3', '1.2.3', 'latest'],
  ['v1.2.3-alpha.4', '1.2.3-alpha.4', 'alpha'],
  ['v1.2.3-beta.4', '1.2.3-beta.4', 'beta'],
  ['v1.2.3-rc.4', '1.2.3-rc.4', 'rc'],
]
for (const [gitTag, version, npmTag] of validCases) {
  assert.deepEqual(resolveRelease(gitTag, version), { gitTag, version, npmTag })
}

const invalidCases = [
  ['1.2.3', '1.2.3'],
  ['v01.2.3', '01.2.3'],
  ['v1.2.3-01', '1.2.3-01'],
  ['v1.2.3-preview.1', '1.2.3-preview.1'],
  ['v1.2.3', '1.2.4'],
]
for (const [gitTag, version] of invalidCases) {
  assert.throws(() => resolveRelease(gitTag, version))
}

const release = resolveRelease('v' + manifest.version, manifest.version)
console.log(JSON.stringify({ package: manifest.name, version: release.version, tag: release.npmTag }))
