import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const approvedReleaseMetadata = new Map([
  ['0.1.0-alpha.0', 'bootstrap'],
  ['0.1.0-beta.2', 'beta'],
])

const expectedTag = approvedReleaseMetadata.get(manifest.version)
if (expectedTag === undefined) {
  throw new Error(`unapproved release metadata version: ${manifest.version}`)
}
if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org' || manifest.publishConfig?.access !== 'public') {
  throw new Error('release metadata registry or access drifted')
}
if (manifest.publishConfig?.tag !== expectedTag) {
  throw new Error(`release metadata tag drifted: expected ${expectedTag}, got ${manifest.publishConfig?.tag}`)
}
if (manifest.version === '0.1.0-alpha.0' && ['latest', 'beta'].includes(manifest.publishConfig.tag)) {
  throw new Error('bootstrap release must not be assigned a consumer dist-tag')
}

console.log(JSON.stringify({ package: manifest.name, version: manifest.version, tag: manifest.publishConfig.tag }))
