import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv from 'ajv/dist/2020.js'

const root = new URL('../schemas/', import.meta.url)
const base = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
const ajv = new Ajv({ strict: true })
const names = [
  'ui-common',
  'managed-service-console-source',
  'managed-service-console-request',
  'managed-service-console-result',
]
for (const name of names) ajv.addSchema(JSON.parse(readFileSync(new URL(name + '.v1.schema.json', root))))
const check = (name, value) => ajv.getSchema(base + 'managed-service-console-' + name + '.v1.schema.json')(value)
const source = {
  contract: 'cordisx.managed-service-console-source/v1',
  serviceId: 'gateway',
  operationId: 'console.session',
  landingPath: '/providers',
}
assert.ok(check('source', source))
assert.ok(!check('source', { ...source, landingPath: '//other.invalid/' }))
assert.ok(!check('source', { ...source, landingPath: '/escape/../providers' }))
const request = {
  contract: 'cordisx.managed-service-console-request/v1',
  action: 'prepare',
  binding: 'a'.repeat(64),
  origin: 'http://127.0.0.1:18765',
}
assert.ok(check('request', request))
assert.ok(!check('request', { ...request, account: 'caller-selected' }))
assert.ok(!check('request', { ...request, origin: 'http://localhost:18765' }))
assert.ok(!check('request', { ...request, origin: request.origin + '/private' }))
const result = {
  contract: 'cordisx.managed-service-console-result/v1',
  status: 'prepared',
  cookie: { name: '__Host-fixture', value: 'a'.repeat(32), maxAgeSeconds: 600 },
}
assert.ok(check('result', result))
assert.ok(!check('result', { ...result, status: 'unavailable' }))
assert.ok(!check('result', { ...result, cookie: undefined }))
assert.ok(!check('result', { ...result, cookie: { ...result.cookie, maxAgeSeconds: 28801 } }))
assert.ok(!check('result', { ...result, cookie: { ...result.cookie, domain: '127.0.0.1' } }))
assert.ok(check('result', { contract: result.contract, status: 'revoked' }))
console.log('Authenticated managed console schemas passed')
