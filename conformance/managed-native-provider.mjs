import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'

const schema = JSON.parse(
  await readFile(new URL('../schemas/managed-native-provider-catalog.v1.schema.json', import.meta.url), 'utf8'),
)
const vectors = JSON.parse(
  await readFile(new URL('../test-vectors/managed-native-provider-catalog.v1.json', import.meta.url), 'utf8'),
)
const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema)
const efforts = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']

function digest(catalog) {
  const routes = [...catalog.routes].sort((a, b) =>
    Buffer.compare(
      Buffer.from(JSON.stringify([a.alias, a.gatewayModelId])),
      Buffer.from(JSON.stringify([b.alias, b.gatewayModelId])),
    )
  ).map(route => {
    const reasoning = route.reasoningCapabilities
    const tuple = [route.alias, route.gatewayModelId]
    if (reasoning !== undefined) {
      tuple.push({
        efforts: reasoning.efforts,
        ...(reasoning.defaultEffort === undefined ? {} : { defaultEffort: reasoning.defaultEffort }),
      })
    }
    return tuple
  })
  return `sha256:${
    createHash('sha256').update(JSON.stringify([catalog.generation, catalog.defaultAlias, routes])).digest('hex')
  }`
}

function valid(catalog) {
  if (!validate(catalog)) return false
  const aliases = catalog.routes.map(route => route.alias)
  const ids = catalog.routes.map(route => route.gatewayModelId)
  if (
    new Set(aliases).size !== aliases.length || new Set(ids).size !== ids.length
    || !aliases.includes(catalog.defaultAlias)
  ) return false
  for (const route of catalog.routes) {
    const reasoning = route.reasoningCapabilities
    if (reasoning === undefined) continue
    if (reasoning.defaultEffort !== undefined && !reasoning.efforts.includes(reasoning.defaultEffort)) return false
    if (
      reasoning.efforts.some((effort, index) =>
        index > 0 && efforts.indexOf(effort) <= efforts.indexOf(reasoning.efforts[index - 1])
      )
    ) return false
  }
  return digest(catalog) === catalog.digest
}

for (const vector of vectors) assert.equal(valid(vector), true)
assert.notEqual(vectors[0].digest, vectors[1].digest)
for (
  const capability of [
    { efforts: [] },
    { efforts: ['high', 'low'] },
    { efforts: ['low', 'low'] },
    { efforts: ['extreme'] },
    { efforts: ['low'], defaultEffort: 'high' },
    { efforts: ['low'], endpoint: 'forbidden' },
  ]
) {
  const candidate = structuredClone(vectors[1])
  candidate.routes[0].reasoningCapabilities = capability
  candidate.digest = digest(candidate)
  assert.equal(valid(candidate), false)
}
const changed = structuredClone(vectors[1])
changed.routes[0].reasoningCapabilities.defaultEffort = 'low'
assert.equal(valid(changed), false)
console.log('Managed native provider catalog: legacy and reasoning-aware digest/capability conformance passed')
