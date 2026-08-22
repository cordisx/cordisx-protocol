import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginSchema = JSON.parse(await readFile(path.join(root, 'schemas/marketplace-plugin.v1.schema.json'), 'utf8'))
const feedSchema = JSON.parse(await readFile(path.join(root, 'schemas/marketplace-feed.v1.schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
ajv.addSchema(pluginSchema)
const validatePluginSchema = ajv.getSchema(pluginSchema.$id)
const validateFeedSchema = ajv.compile(feedSchema)
if (validatePluginSchema === undefined) throw new Error('plugin schema was not registered')

export function canonicalSource(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    throw new Error('source must be an HTTPS URL without credentials, query, or fragment')
  }
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.href
}

export function validatePlugin(plugin) {
  if (!validatePluginSchema(plugin)) return validatePluginSchema.errors ?? []
  try {
    if (canonicalSource(plugin.source) !== plugin.source) return [{ message: 'source must use canonical serialization' }]
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }]
  }
  return []
}

function comparePlugins(left, right) {
  return left.source.localeCompare(right.source)
    || left.id.localeCompare(right.id)
    || left.version.localeCompare(right.version)
}

export function validateFeed(feed) {
  const errors = []
  if (!validateFeedSchema(feed)) errors.push(...(validateFeedSchema.errors ?? []))
  if (!Array.isArray(feed?.plugins)) return errors
  const identities = new Set()
  for (const [index, plugin] of feed.plugins.entries()) {
    for (const error of validatePlugin(plugin)) errors.push({ message: `plugins[${index}]: ${error.message}` })
    if (typeof plugin?.source !== 'string' || typeof plugin?.id !== 'string') continue
    const identity = `${plugin.source}\u0000${plugin.id}`
    if (identities.has(identity)) errors.push({ message: `duplicate plugin identity: ${plugin.source} + ${plugin.id}` })
    identities.add(identity)
  }
  const sorted = [...feed.plugins].sort(comparePlugins)
  if (JSON.stringify(sorted) !== JSON.stringify(feed.plugins)) errors.push({ message: 'plugins must use deterministic source/id/version ordering' })
  return errors
}

async function jsonFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => path.join(directory, entry.name))
    .sort()
}

let failures = 0
for (const file of await jsonFiles(path.join(root, 'test-vectors/marketplace/valid'))) {
  const value = JSON.parse(await readFile(file, 'utf8'))
  const errors = validatePlugin(value)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/marketplace/invalid'))) {
  const value = JSON.parse(await readFile(file, 'utf8'))
  if (validatePlugin(value).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/marketplace/feeds'))) {
  const value = JSON.parse(await readFile(file, 'utf8'))
  const shouldPass = path.basename(file).startsWith('valid-')
  const passed = validateFeed(value).length === 0
  if (passed !== shouldPass) {
    console.error(`${path.relative(root, file)} should ${shouldPass ? 'pass' : 'fail'}`, validateFeed(value))
    failures += 1
  }
}

if (failures > 0) throw new Error(`${failures} marketplace conformance case(s) failed`)
console.log('marketplace conformance: all vectors passed')
