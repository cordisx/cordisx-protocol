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
  'managed-service-browser-console-source',
  'managed-service-browser-console-request',
  'managed-service-browser-console-result',
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
const checkBrowser = (name, value) =>
  ajv.getSchema(base + 'managed-service-browser-console-' + name + '.v1.schema.json')(value)
const browserSource = {
  contract: 'cordisx.managed-service-browser-console-source/v1',
  serviceId: source.serviceId,
  operationId: 'console.browser-ticket',
  redeemPath: '/auth/managed-console/browser',
}
assert.ok(checkBrowser('source', browserSource))
assert.ok(!check('source', browserSource))
assert.ok(!checkBrowser('source', source))
assert.ok(!checkBrowser('source', { ...browserSource, landingPath: source.landingPath }))
for (
  const redeemPath of [
    '/',
    '//other.invalid/entry',
    '/entry?ticket=a',
    '/entry#x',
    '/%2e/entry',
    '/x/../entry',
    '/entry\\path',
  ]
) {
  assert.ok(!checkBrowser('source', { ...browserSource, redeemPath }))
}

const browserRequest = { binding: request.binding, origin: request.origin }
assert.ok(checkBrowser('request', browserRequest))
assert.ok(!checkBrowser('request', request))
assert.ok(!check('request', browserRequest))
assert.ok(!checkBrowser('request', { ...browserRequest, binding: 'A'.repeat(64) }))
assert.ok(!checkBrowser('request', { ...browserRequest, origin: 'http://service.localhost:18765' }))
assert.ok(!checkBrowser('request', { ...browserRequest, account: 'caller-selected' }))

const browserResult = { status: 'issued', ticket: 'a'.repeat(32) }
assert.ok(checkBrowser('result', browserResult))
assert.ok(!checkBrowser('result', result))
assert.ok(!check('result', browserResult))
assert.ok(!checkBrowser('result', { status: 'issued' }))
assert.ok(!checkBrowser('result', { ...browserResult, ticket: browserResult.ticket + '=' }))
assert.ok(!checkBrowser('result', { ...browserResult, cookie: result.cookie }))
for (const status of ['sign-in-required', 'unavailable']) {
  assert.ok(checkBrowser('result', { status }))
  assert.ok(!checkBrowser('result', { ...browserResult, status }))
}
console.log('Authenticated managed console and browser ticket schemas passed')
