const domain = 'cordisx.managed-source/v1\n'
function canonical(value, depth = 0) {
  if (depth > 32) throw new Error('invalid managed source value')
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(item => canonical(item, depth + 1)).join(',') + ']'
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + canonical(value[key], depth + 1)
    ).join(',') + '}'
  }
  throw new Error('invalid managed source value')
}
export function managedSourceBytes(value) {
  const bytes = new TextEncoder().encode(domain + canonical(value))
  if (bytes.byteLength > 1_048_576) throw new Error('managed source value too large')
  return bytes
}
function text(value) {
  if (typeof value !== 'string' || !value || value.length > 256 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error('invalid managed source binding')
  }
  return value
}
export function managedSourceBinding(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid managed source binding')
  const origin = text(value.origin), url = new URL(origin)
  const local = url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname)
  const remoteAccount = url.protocol === 'https:' && value.audience === 'source-account'
  if (url.origin !== origin || (!local && !remoteAccount)) {
    throw new Error('managed source requires pinned loopback or HTTPS account origin')
  }
  if (!['source-account', 'work-income'].includes(value.audience)) throw new Error('invalid managed source audience')
  return { origin, sourceId: text(value.sourceId), instanceId: text(value.instanceId), audience: value.audience }
}
export function managedSourceChallenge(value, binding, now = Date.now()) {
  const parsed = managedSourceBinding(value)
  if (
    Object.keys(value).some(key =>
      !['contract', 'origin', 'sourceId', 'instanceId', 'audience', 'nonce', 'expiresAt'].includes(key)
    )
  ) {
    throw new Error('invalid managed source challenge fields')
  }
  if (
    value.contract !== 'cordisx.managed-source-challenge/v1'
    || Object.keys(parsed).some(key => parsed[key] !== binding[key])
    || typeof value.nonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/u.test(value.nonce)
    || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + 30_000
  ) {
    throw new Error('invalid managed source challenge')
  }
  return { ...parsed, contract: value.contract, nonce: value.nonce, expiresAt: value.expiresAt }
}
