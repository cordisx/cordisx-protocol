import { createHash } from 'node:crypto'

export function validateBytes(request) {
  const input = request.input
  if (Buffer.byteLength(JSON.stringify(request)) > 196608) throw new Error('RPC_BOUND')
  if (input.kind !== 'bytes') throw new Error('INPUT_KIND')
  if (input.bytesBase64.length > 174764) throw new Error('ENCODED_BOUND')
  const bytes = Buffer.from(input.bytesBase64, 'base64')
  if (bytes.length < 1 || bytes.length > 131072) throw new Error('DECODED_BOUND')
  if (bytes.toString('base64') !== input.bytesBase64) throw new Error('NONCANONICAL')
  if (bytes.length !== input.size) throw new Error('SIZE_MISMATCH')
  if (createHash('sha256').update(bytes).digest('hex') !== input.sha256) throw new Error('HASH_MISMATCH')
  return bytes
}

export class OutboundModel {
  constructor() {
    this.media = new Map()
    this.deliveries = new Map()
  }

  prepare(scope, target, type, bytes) {
    if (!scope.taskVerified) throw new Error('TASK_DENIED')
    const handle = `media:token_${this.media.size}`
    this.media.set(handle, {
      owner: scope.owner,
      generation: scope.generation,
      profile: scope.profile,
      target: JSON.stringify(target),
      type,
      bytes: Buffer.from(bytes),
      revoked: false,
    })
    return handle
  }

  authorize(scope, request) {
    if (!scope.taskVerified || !scope.targetAllowed) throw new Error('DENIED')
    const handle = request.content.handle
    if (!handle) return
    const media = this.media.get(handle)
    if (
      !media || media.revoked || media.owner !== scope.owner || media.profile !== scope.profile
      || media.generation !== scope.generation || media.target !== JSON.stringify(request.target)
      || media.type !== request.content.type
    ) throw new Error('MEDIA_UNAVAILABLE')
  }

  send(scope, request, types) {
    this.authorize(scope, request)
    const key = JSON.stringify([scope.profile, scope.owner, scope.generation, request.target, request.idempotencyKey])
    const original = JSON.stringify(request)
    const existing = this.deliveries.get(key)
    if (existing) {
      if (existing.original !== original) throw new Error('IDEMPOTENCY_CONFLICT')
      return existing
    }
    const effectiveType = types.includes(request.content.type)
      ? request.content.type
      : request.fallback.mode === 'text' && types.includes('text')
      ? 'text'
      : undefined
    if (!effectiveType) throw new Error('UNSUPPORTED')
    const delivery = {
      deliveryId: `delivery_${this.deliveries.size}`,
      original,
      request,
      effectiveType,
      status: 'queued',
    }
    this.deliveries.set(key, delivery)
    return delivery
  }

  resolve(adapter, handle, delivery) {
    const media = this.media.get(handle)
    if (
      !media || media.revoked || adapter.deliveryId !== delivery.deliveryId || adapter.generation !== media.generation
      || adapter.accountId !== delivery.request.target.accountId || delivery.request.content.handle !== handle
      || delivery.effectiveType === 'text'
    ) throw new Error('RESOLVE_DENIED')
    return Buffer.from(media.bytes)
  }
}
