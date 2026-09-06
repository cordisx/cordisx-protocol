import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function packEntries(output) {
  const parsed = JSON.parse(output)
  const entries = Array.isArray(parsed) ? parsed : Object.values(parsed)
  if (
    entries.length !== 1 || entries[0] === null || typeof entries[0] !== 'object' || !Array.isArray(entries[0].files)
  ) {
    throw new Error('expected exactly one npm pack result with a files array')
  }
  return entries
}

export function fileDigest(directory, files) {
  const digest = createHash('sha256')
  for (const file of files) {
    digest.update(file)
    digest.update('\0')
    digest.update(readFileSync(join(directory, file)))
    digest.update('\0')
  }
  return digest.digest('hex')
}
