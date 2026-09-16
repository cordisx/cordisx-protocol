import { managedSourceBytes } from './managed-source.v1.js'

export function localWalletBytes(value) {
  // Reuse the frozen JSON algorithm, with a distinct signing domain.
  const canonical = new TextDecoder().decode(managedSourceBytes(value)).slice('cordisx.managed-source/v1\n'.length)
  const bytes = new TextEncoder().encode('cordisx.local-wallet/v1\n' + canonical)
  if (bytes.byteLength > 1_048_576) throw new Error('local wallet value too large')
  return bytes
}
export function localWalletBinding(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid local wallet binding')
  for (const key of ['origin', 'sourceId', 'instanceId']) {
    if (
      typeof value[key] !== 'string' || !value[key] || value[key].length > 256
      || /[\u0000-\u001f\u007f]/u.test(value[key])
    ) throw new Error('invalid local wallet binding')
  }
  const url = new URL(value.origin)
  if (
    url.origin !== value.origin || url.protocol !== 'http:'
    || !['127.0.0.1', '[::1]'].includes(url.hostname)
  ) throw new Error('local wallet requires a canonical pinned loopback origin')
  if (!['local-wallet-enrollment', 'local-wallet', 'local-work-income'].includes(value.audience)) {
    throw new Error('invalid local wallet audience')
  }
  return { origin: value.origin, sourceId: value.sourceId, instanceId: value.instanceId, audience: value.audience }
}
export function localWalletChallenge(value, binding, now = Date.now()) {
  const parsed = localWalletBinding(value)
  if (
    Object.keys(value).some(key =>
      !['contract', 'origin', 'sourceId', 'instanceId', 'audience', 'nonce', 'expiresAt'].includes(key)
    ) || value.contract !== 'cordisx.local-wallet-challenge/v1'
    || Object.keys(parsed).some(key => parsed[key] !== binding[key])
    || typeof value.nonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/u.test(value.nonce)
    || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + 30_000
  ) throw new Error('invalid local wallet challenge')
  return { ...parsed, contract: value.contract, nonce: value.nonce, expiresAt: value.expiresAt }
}
