const record = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid settlement receipt')
  return value
}
const fields = (value, names) => Object.keys(value).length === names.length
  && names.every(name => Object.hasOwn(value, name))
const safe = value => Number.isSafeInteger(value) && value >= 0
/** Checks no signature and confers no financial or signing authority. */
export function localWorkSettlementReceipt(value, snapshot, binding, accountId) {
  const receipt = record(value), target = record(receipt.binding), cursor = record(receipt.cursor)
  const expected = {
    scopeId: snapshot.scopeId,
    sourceId: snapshot.sourceId,
    epoch: snapshot.epoch,
    revision: snapshot.revision,
    tokens: snapshot.eligibleTokens,
    observedThrough: snapshot.observedThrough,
  }
  if (
    !fields(receipt, ['eventId', 'binding', 'amount', 'remainder', 'cursor', 'coverage', 'policy'])
    || typeof receipt.eventId !== 'string' || !/^work:[a-f0-9]{64}$/u.test(receipt.eventId)
    || !fields(target, ['instanceId', 'accountId', 'scopeId']) || target.instanceId !== binding.instanceId
    || target.accountId !== accountId || target.scopeId !== snapshot.scopeId
    || !fields(cursor, Object.keys(expected)) || Object.keys(expected).some(key => cursor[key] !== expected[key])
    || !safe(receipt.amount) || !safe(receipt.remainder) || receipt.remainder >= 10_000
    || receipt.coverage !== 'partial' || receipt.policy !== 'durable-admitted-v1'
  ) throw new Error('invalid settlement receipt')
  return structuredClone(receipt)
}
