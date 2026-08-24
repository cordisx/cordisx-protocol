import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginSchemas = [1, 2, 3].map(async version => JSON.parse(await readFile(path.join(root, `schemas/marketplace-plugin.v${version}.schema.json`), 'utf8')))
const feedSchemas = [1, 2, 3].map(async version => JSON.parse(await readFile(path.join(root, `schemas/marketplace-feed.v${version}.schema.json`), 'utf8')))
const resolvedPluginSchemas = await Promise.all(pluginSchemas)
const resolvedFeedSchemas = await Promise.all(feedSchemas)
const marketplaceSourceSchema = JSON.parse(await readFile(path.join(root, 'schemas/marketplace-source.v1.schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true })
addFormats(ajv)
for (const dependency of ['ui-common.v1.schema.json', 'plugin-lifecycle-common.v1.schema.json', 'marketplace-official.v1.schema.json', 'marketplace-certification.v1.schema.json']) {
  ajv.addSchema(JSON.parse(await readFile(path.join(root, 'schemas', dependency), 'utf8')))
}
for (const schema of resolvedPluginSchemas) ajv.addSchema(schema)
const pluginValidators = new Map(resolvedPluginSchemas.map(schema => [schema.properties.schemaVersion.const, ajv.getSchema(schema.$id)]))
const feedValidators = new Map(resolvedFeedSchemas.map(schema => [schema.properties.schemaVersion.const, ajv.compile(schema)]))
const marketplaceSourceValidator = ajv.compile(marketplaceSourceSchema)
if ([...pluginValidators.values()].some(validator => validator === undefined)) throw new Error('plugin schema was not registered')

export function canonicalSource(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    throw new Error('source must be an HTTPS URL without credentials, query, or fragment')
  }
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.href
}

export function canonicalMarketplaceFeedUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.hash !== '') {
    throw new Error('marketplace feed URL must be HTTPS without credentials or fragment')
  }
  return url.href
}

export function validateMarketplaceSource(source) {
  if (!marketplaceSourceValidator(source)) return marketplaceSourceValidator.errors ?? [{ message: 'invalid marketplace source' }]
  const errors = []
  try {
    if (canonicalMarketplaceFeedUrl(source.url) !== source.url) errors.push({ message: 'marketplace source URL must use canonical serialization' })
  } catch (error) {
    errors.push({ message: error instanceof Error ? error.message : String(error) })
  }
  for (const [field, value] of Object.entries(source.local ?? {})) {
    if (value !== value.trim()) errors.push({ message: `marketplace source local.${field} must not have leading or trailing whitespace` })
  }
  return errors
}

function canonicalLocale(value) {
  const [canonical] = Intl.getCanonicalLocales(value)
  if (canonical === undefined) throw new Error(`invalid locale: ${value}`)
  return canonical
}

function localeErrors(value, label, authorCount) {
  const errors = []
  if (canonicalLocale(value.fallbackLocale) !== value.fallbackLocale) errors.push({ message: `${label}.fallbackLocale must use canonical serialization` })
  for (const [locale, localization] of Object.entries(value.localizations ?? {})) {
    if (canonicalLocale(locale) !== locale) errors.push({ message: `${label}.localizations locale must use canonical serialization: ${locale}` })
    if (locale === value.fallbackLocale) errors.push({ message: `${label}.localizations must not repeat fallbackLocale ${locale}` })
    if (authorCount !== undefined && localization.authors !== undefined && localization.authors.length !== authorCount) {
      errors.push({ message: `${label}.localizations.${locale}.authors must match the base author order and length` })
    }
  }
  return errors
}

function localizedField(raw, localizations, field, currentLocale, fallbackLocale) {
  const current = canonicalLocale(currentLocale)
  for (const locale of [...new Set([current, fallbackLocale, 'en'])]) {
    if (locale === fallbackLocale) return raw
    const candidate = localizations?.[locale]?.[field]
    if (candidate !== undefined) return candidate
  }
  return raw
}

/** Deterministic display/search projection; stable identity and canonical URLs never enter localization. */
export function projectPluginMetadata(plugin, currentLocale) {
  const fallbackLocale = plugin.schemaVersion >= 2 ? plugin.fallbackLocale : 'en'
  const localizations = plugin.schemaVersion >= 2 ? plugin.localizations : undefined
  return {
    name: localizedField(plugin.name, localizations, 'name', currentLocale, fallbackLocale),
    description: localizedField(plugin.description, localizations, 'description', currentLocale, fallbackLocale),
    authors: localizedField(plugin.authors.map(author => author.name), localizations, 'authors', currentLocale, fallbackLocale),
    keywords: localizedField(plugin.keywords ?? [], localizations, 'keywords', currentLocale, fallbackLocale),
  }
}

export function projectFeedName(feed, currentLocale) {
  const fallbackLocale = feed.schemaVersion >= 2 ? feed.fallbackLocale : 'en'
  return localizedField(feed.name, feed.schemaVersion >= 2 ? feed.localizations : undefined, 'name', currentLocale, fallbackLocale)
}

export function validatePlugin(plugin) {
  const validatePluginSchema = pluginValidators.get(plugin?.schemaVersion)
  if (validatePluginSchema === undefined || !validatePluginSchema(plugin)) return validatePluginSchema?.errors ?? [{ message: 'unsupported marketplace plugin schemaVersion' }]
  const errors = []
  try {
    if (canonicalSource(plugin.source) !== plugin.source) errors.push({ message: 'source must use canonical serialization' })
  } catch (error) {
    errors.push({ message: error instanceof Error ? error.message : String(error) })
  }
  if (plugin.schemaVersion >= 2) {
    try {
      errors.push(...localeErrors(plugin, 'plugin', plugin.authors.length))
    } catch (error) {
      errors.push({ message: error instanceof Error ? error.message : String(error) })
    }
  }
  if (plugin.schemaVersion === 3 && plugin.artifact !== undefined
    && !plugin.artifact.packageName.startsWith(`${plugin.artifact.packageNamespace}/`)) {
    errors.push({ message: 'artifact.packageName must belong to artifact.packageNamespace' })
  }
  return errors
}

function comparePlugins(left, right) {
  return left.source.localeCompare(right.source)
    || left.id.localeCompare(right.id)
    || left.version.localeCompare(right.version)
}

export function validateFeed(feed) {
  const errors = []
  const validateFeedSchema = feedValidators.get(feed?.schemaVersion)
  if (validateFeedSchema === undefined) errors.push({ message: 'unsupported marketplace feed schemaVersion' })
  else if (!validateFeedSchema(feed)) errors.push(...(validateFeedSchema.errors ?? []))
  if (feed?.schemaVersion >= 2) {
    try {
      errors.push(...localeErrors(feed, 'feed'))
    } catch (error) {
      errors.push({ message: error instanceof Error ? error.message : String(error) })
    }
  }
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
for (const file of await jsonFiles(path.join(root, 'test-vectors/marketplace-source/valid'))) {
  const value = JSON.parse(await readFile(file, 'utf8'))
  const errors = validateMarketplaceSource(value)
  if (errors.length > 0) {
    console.error(`${path.relative(root, file)} should be valid`, errors)
    failures += 1
  }
}
for (const file of await jsonFiles(path.join(root, 'test-vectors/marketplace-source/invalid'))) {
  const value = JSON.parse(await readFile(file, 'utf8'))
  if (validateMarketplaceSource(value).length === 0) {
    console.error(`${path.relative(root, file)} should be invalid`)
    failures += 1
  }
}

const localizedFeed = JSON.parse(await readFile(path.join(root, 'test-vectors/marketplace/feeds/valid-localized-v2.json'), 'utf8'))
const localizedPlugin = localizedFeed.plugins[0]
const zhProjection = projectPluginMetadata(localizedPlugin, 'zh-CN')
if (projectFeedName(localizedFeed, 'zh-CN') !== 'CordisX 插件商店'
  || zhProjection.name !== '点位展示'
  || zhProjection.description !== '展示结构化 CordisX 扩展点。'
  || JSON.stringify(zhProjection.authors) !== JSON.stringify(['CordisX 团队'])
  || JSON.stringify(zhProjection.keywords) !== JSON.stringify(['扩展点', '界面'])) {
  console.error('marketplace v2 zh-CN projection is incorrect', zhProjection)
  failures += 1
}
const fallbackProjection = projectPluginMetadata(localizedPlugin, 'fr-FR')
if (projectFeedName(localizedFeed, 'fr-FR') !== 'CordisX Marketplace'
  || fallbackProjection.name !== 'Slot Showcase'
  || fallbackProjection.description !== 'Shows structured CordisX extension points.') {
  console.error('marketplace v2 fallback projection is incorrect', fallbackProjection)
  failures += 1
}

if (failures > 0) throw new Error(`${failures} marketplace conformance case(s) failed`)
console.log('marketplace conformance: all vectors passed')
