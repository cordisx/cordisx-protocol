import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const semverPattern =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
const prereleaseChannels = new Set(['alpha', 'beta', 'rc'])

export function resolveRelease(gitTag, manifestVersion) {
  if (typeof gitTag !== 'string' || !gitTag.startsWith('v')) {
    throw new Error('release tag must use the v<semver> form')
  }
  const version = gitTag.slice(1)
  const match = semverPattern.exec(version)
  if (match === null) throw new Error('release tag is not strict SemVer: ' + gitTag)

  const prerelease = match[4]
  if (
    prerelease?.split('.').some(identifier =>
      /^[0-9]+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0')
    )
  ) {
    throw new Error('release tag has a zero-padded numeric prerelease identifier: ' + gitTag)
  }
  if (version !== manifestVersion) {
    throw new Error('release tag version ' + version + ' does not match package version ' + manifestVersion)
  }

  let npmTag = 'latest'
  if (prerelease !== undefined) {
    const prereleaseId = prerelease.split('.')[0]
    if (!prereleaseChannels.has(prereleaseId)) {
      throw new Error('unsupported prerelease channel: ' + prereleaseId)
    }
    npmTag = prereleaseId
  }

  return { gitTag, version, npmTag }
}

function readOptions(arguments_) {
  let tag
  let githubOutput
  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index]
    const value = arguments_[index + 1]
    if (value === undefined) throw new Error('missing value for ' + option)
    if (option === '--tag') tag = value
    else if (option === '--github-output') githubOutput = value
    else throw new Error('unknown option: ' + option)
  }
  if (tag === undefined) throw new Error('usage: resolve-release.mjs --tag v<semver> [--github-output <path>]')
  return { tag, githubOutput }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const options = readOptions(process.argv.slice(2))
  const release = resolveRelease(options.tag, manifest.version)
  if (options.githubOutput !== undefined) {
    appendFileSync(
      options.githubOutput,
      ['git_tag=' + release.gitTag, 'version=' + release.version, 'npm_tag=' + release.npmTag].join('\n') + '\n',
    )
  }
  console.log(JSON.stringify(release))
}
