// Conformance-only reference broker. Mock transport owns parsing and reports body size.
// Host streaming, process admission and production composition need separate evidence.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const proofContract = 'cordisx.managed-service-web-entry-proof/v1'
export function proof(secret, challenge, origin, instance) {
  return createHmac('sha256', secret).update(JSON.stringify([proofContract, challenge, origin, instance])).digest('hex')
}

export function canonicalOrigin(value) {
  if (typeof value !== 'string' || !/^https?:\/\/(?:127\.0\.0\.1|\[::1\])(?::[1-9][0-9]{0,4})?$/.test(value)) {
    return false
  }
  try {
    const url = new URL(value)
    return value === url.origin && (!url.port || Number(url.port) <= 65535)
  } catch {
    return false
  }
}

export function validateSource(source, definition, validate, admitted = new Set()) {
  if (!validate(source) || source.serviceId !== definition.serviceId || admitted.has(source.serviceId)) {
    throw new Error('invalid-source')
  }
  const operation = definition.operations.find(item => item.operationId === source.operationId)
  const root = 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/'
  const authentication = operation?.httpAuthentication ?? definition.httpAuthentication
  if (
    !operation || operation.method !== 'GET' || operation.requestEncoding !== 'query'
    || operation.responseSchema !== `${root}managed-service-web-entry-source-result.v1.schema.json`
    || (operation.requestSchema
      && operation.requestSchema !== `${root}managed-service-web-entry-challenge.v1.schema.json`)
    || authentication?.mode !== 'authorization-header'
  ) throw new Error('invalid-source')
  admitted.add(source.serviceId)
  return operation
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

async function boundedAwait(operation, state, signal) {
  const controller = new AbortController()
  let timer, rejectWait
  const interrupted = new Promise((_, reject) => {
    rejectWait = reject
  })
  const cancel = code => {
    controller.abort()
    rejectWait(new Error(code))
  }
  const abort = () => cancel('cancelled')
  const dispose = () => cancel('disposed')
  signal?.addEventListener('abort', abort, { once: true })
  state.signal?.addEventListener('abort', dispose, { once: true })
  timer = setTimeout(() => cancel('timeout'), Math.max(0, state.deadline - state.now()))
  try {
    if (signal?.aborted) abort()
    if (state.signal?.aborted) dispose()
    return await Promise.race([
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new Error('cancelled')
        return operation(controller.signal)
      }),
      interrupted,
    ])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
    state.signal?.removeEventListener('abort', dispose)
  }
}
// Host-private issuance, separate from a parent binding that can survive restart.
const issuedBindings = new WeakMap()
export function createHandle(record) {
  let issued = issuedBindings.get(record)
  if (!issued || issued.generation !== record.serviceGeneration || !same(issued.parent, record.binding)) {
    issued = {
      generation: record.serviceGeneration,
      parent: structuredClone(record.binding),
      binding: { ...structuredClone(record.binding), bindingId: `web-entry-${randomBytes(32).toString('hex')}` },
    }
    issuedBindings.set(record, issued)
  }
  return {
    contract: 'cordisx.managed-service-web-entry/v1',
    binding: structuredClone(issued.binding),
    parentBinding: structuredClone(record.binding),
    serviceGeneration: record.serviceGeneration,
    pluginGeneration: record.pluginGeneration,
    hostGeneration: record.hostGeneration,
    record,
    source: record.source,
    registration: record.registration,
  }
}

export async function readEntry(handle, options) {
  const { state, transport, challenge, validateResult, validateProof, validateRequest, request, caller, signal } =
    options
  const unavailable = code => ({
    contract: 'cordisx.managed-service-web-entry-result/v1',
    binding: handle.binding,
    serviceGeneration: handle.serviceGeneration,
    status: 'unavailable',
    code,
  })
  const fail = code => {
    throw new Error(code)
  }
  const fence = () => {
    if (signal?.aborted) fail('cancelled')
    if (state.now() >= state.deadline) fail('timeout')
    if (caller !== state.owner) fail('owner-unavailable')
    if (state.disposed || state.signal?.aborted) fail('disposed')
    if (state.current !== handle.record || !same(state.current.binding, handle.parentBinding)) fail('binding-replaced')
    if (
      state.current.serviceGeneration !== handle.serviceGeneration
      || state.current.pluginGeneration !== handle.pluginGeneration
      || state.current.hostGeneration !== handle.hostGeneration
    ) fail('stale-generation')
    const issued = issuedBindings.get(state.current)
    if (!issued || issued.generation !== handle.serviceGeneration || !same(issued.binding, handle.binding)) {
      fail('binding-replaced')
    }
    if (state.current.registration !== handle.registration || state.current.source !== handle.source) {
      fail('binding-replaced')
    }
    if (
      !state.current.running || !state.current.endpointOwned
      || ['failed', 'stopping', 'stopped', 'disposed'].includes(state.current.status)
    ) {
      fail('service-unavailable')
    }
  }
  const bounded = (response, validate) => {
    if (response.redirected || response.bytes > 65536 || !validate(response.value)) fail('invalid-source')
    return response.value
  }
  try {
    if (
      !validateRequest(request) || !same(request.binding, handle.binding)
      || request.serviceGeneration !== handle.serviceGeneration
    ) {
      fail('stale-generation')
    }
    fence()
    if (!handle.source) fail('unsupported')
    const originAtRead = state.current.origin
    if (!canonicalOrigin(originAtRead)) fail('ownership-unverified')
    const checkEndpoint = () => {
      fence()
      if (state.current.origin !== originAtRead) fail('binding-replaced')
    }
    const result = await boundedAwait(
      requestSignal =>
        transport.source({
          origin: originAtRead,
          operationId: handle.source.operationId,
          query: { challenge },
          redirect: 'error',
          credentials: 'omit',
          authorization: 'current-broker',
          signal: requestSignal,
        }),
      state,
      signal,
    )
    checkEndpoint()
    const source = bounded(result, validateResult)
    if (source.status === 'unavailable') return unavailable('service-unavailable')
    if (!canonicalOrigin(source.origin)) fail('invalid-source')
    if (source.origin !== originAtRead) {
      if (!handle.source.verification || !source.verification) fail('ownership-unverified')
      const response = await boundedAwait(
        requestSignal =>
          transport.secondary({
            origin: source.origin,
            path: handle.source.verification.path,
            query: { challenge },
            redirect: 'error',
            credentials: 'omit',
            signal: requestSignal,
          }),
        state,
        signal,
      )
      checkEndpoint()
      const secondary = bounded(response, validateProof)
      if (
        secondary.instance !== source.verification.instance
        || !timingSafeEqual(Buffer.from(secondary.proof, 'hex'), Buffer.from(source.verification.proof, 'hex'))
      ) {
        fail('ownership-unverified')
      }
    }
    checkEndpoint()
    return {
      contract: 'cordisx.managed-service-web-entry-result/v1',
      binding: handle.binding,
      serviceGeneration: handle.serviceGeneration,
      status: 'available',
      origin: source.origin,
    }
  } catch (error) {
    const codes = [
      'unsupported',
      'owner-unavailable',
      'service-unavailable',
      'stale-generation',
      'binding-replaced',
      'disposed',
      'cancelled',
      'timeout',
      'invalid-source',
      'ownership-unverified',
    ]
    return unavailable(codes.includes(error.message) ? error.message : 'service-unavailable')
  }
}
