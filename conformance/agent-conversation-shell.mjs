import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const names = ['ui-common.v1.schema.json', 'agent-avatar.v1.schema.json', 'agent-conversation-shell-common.v1.schema.json', 'agent-conversation-shell-binding.v1.schema.json', 'agent-conversation-shell-snapshot.v1.schema.json', 'agent-conversation-shell-subscription.v1.schema.json', 'agent-conversation-shell-page.v1.schema.json', 'agent-conversation-shell-result.v1.schema.json', 'agent-conversation-shell-command-context.v1.schema.json']
const schemas = new Map(await Promise.all(names.map(async n => [n, JSON.parse(await readFile(path.join(root, 'schemas', n), 'utf8'))])))
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }); addFormats(ajv); for (const x of schemas.values()) ajv.addSchema(x)
const v = Object.fromEntries(names.map(n => [n, ajv.getSchema(schemas.get(n).$id)]))
const text = fallback => ({ key: 'chatroom.label', fallback }); const command = id => ({ id }); const action = id => ({ id, label: text(id), icon: 'host:more', command: command(`chatroom:${id}`), disabled: { value: false } })
const participant = { participantId: 'participant-1', role: 'agent', displayName: text('Ada'), avatar: { kind: 'asset', ref: 'asset:participant-1', revision: 'revision:avatar-1' } }
const item = { kind: 'message', itemId: 'item-0', messageId: 'message-0', sequence: 0, author: participant, body: [{ kind: 'text', text: text('Hello') }], timestamp: '2026-08-29T00:00:00.000Z', deliveryState: 'delivered', runState: 'idle', ariaLive: 'polite', actions: [action('more')] }
const binding = { $schema: schemas.get('agent-conversation-shell-binding.v1.schema.json').$id, contract: 'cordisx.agent-conversation-shell-binding/v1', schemaVersion: 1, bindingId: 'binding-1', shell: 'agent-desktop', ownerGeneration: 'generation-1', routeSelection: { scope: 'room-or-new', selectedRoomParam: 'roomId' } }
const snapshot = { $schema: schemas.get('agent-conversation-shell-snapshot.v1.schema.json').$id, contract: 'cordisx.agent-conversation-shell-snapshot/v1', schemaVersion: 1, binding: { bindingId: 'binding-1', ownerGeneration: 'generation-1' }, generation: 'generation-1', snapshotSequence: 0, selection: { kind: 'room', roomId: 'room-1', title: text('Room'), secondary: text('Two'), multiParticipant: true, participantPresentation: 'host-initials', participants: [participant] }, items: [item], composer: { availability: 'available', placeholder: text('Message'), disabled: { value: false }, submit: command('chatroom:submit') }, headerActions: [action('new-room'), action('manage-agents'), action('more')] }
const subscription = { $schema: schemas.get('agent-conversation-shell-subscription.v1.schema.json').$id, contract: 'cordisx.agent-conversation-shell-subscription/v1', schemaVersion: 1, subscriptionId: 'subscription-1', binding: snapshot.binding, generation: 'generation-1', afterSequence: -1, snapshotSequence: 0 }
const page = { $schema: schemas.get('agent-conversation-shell-page.v1.schema.json').$id, contract: 'cordisx.agent-conversation-shell-page/v1', schemaVersion: 1, subscription, afterSequence: -1, phase: 'replay', updates: [{ kind: 'snapshot-replaced', sequence: 0, snapshot }], nextAfterSequence: 0, hasMore: false }
const result = { $schema: schemas.get('agent-conversation-shell-result.v1.schema.json').$id, contract: 'cordisx.agent-conversation-shell-result/v1', schemaVersion: 1, requestId: 'request-1', type: 'subscribe', status: 'accepted', code: 'allowed', subscription }
const context = { $schema: schemas.get('agent-conversation-shell-command-context.v1.schema.json').$id, contract: 'cordisx.agent-conversation-shell-command-context/v1', schemaVersion: 1, binding: snapshot.binding, generation: 'generation-1', scope: 'composer-submit', command: command('chatroom:submit'), submitPayload: 'hello' }
for (const [n, value] of [['agent-conversation-shell-binding.v1.schema.json', binding], ['agent-conversation-shell-snapshot.v1.schema.json', snapshot], ['agent-conversation-shell-subscription.v1.schema.json', subscription], ['agent-conversation-shell-page.v1.schema.json', page], ['agent-conversation-shell-result.v1.schema.json', result], ['agent-conversation-shell-command-context.v1.schema.json', context]]) assert.ok(v[n](value), ajv.errorsText(v[n].errors))
for (const mutate of [x => { x.selection.multiParticipant = false }, x => { x.selection.avatar = 'https://bad.test/a.png' }, x => { x.items[0].avatar = { kind: 'asset', ref: 'avatar-ref-2' } }, x => { x.items[0].body[0].html = '<b>x</b>' }, x => { x.conversation = 'opaque-handle' }]) { const bad = structuredClone(snapshot); mutate(bad); assert.equal(v['agent-conversation-shell-snapshot.v1.schema.json'](bad), false) }
for (const mutate of [x => { x.callback = 'nope' }, x => { x.itemId = 'item-0' }]) { const bad = structuredClone(context); mutate(bad); assert.equal(v['agent-conversation-shell-command-context.v1.schema.json'](bad), false) }
function sameBinding(left, right) { return left?.bindingId === right?.bindingId && left?.ownerGeneration === right?.ownerGeneration }
function participantErrors(selection, items) {
  const errors = []
  if (selection.kind !== 'room') return errors
  const participants = new Map()
  for (const member of selection.participants) {
    if (participants.has(member.participantId)) errors.push('participant identity is duplicated')
    participants.set(member.participantId, member)
  }
  for (const current of items) {
    if (current.kind !== 'message') continue
    const member = participants.get(current.author.participantId)
    if (member === undefined) errors.push('message author is not a selected participant')
    else if (!isDeepStrictEqual(current.author, member)) errors.push('message author overrides member-owned participant identity')
  }
  return errors
}
function traceErrors(trace) {
  const errors = []
  let currentSnapshot = trace.snapshot
  errors.push(...participantErrors(currentSnapshot.selection, currentSnapshot.items))
  if (trace.result.status === 'accepted' && trace.result.type === 'subscribe' && (!sameBinding(trace.result.subscription.binding, trace.binding) || trace.result.subscription.generation !== trace.generation || trace.result.subscription.subscriptionId !== trace.subscription.subscriptionId || trace.result.subscription.afterSequence !== trace.subscription.afterSequence || trace.result.subscription.snapshotSequence !== trace.subscription.snapshotSequence)) errors.push('result subscription identity drift')
  let after = trace.subscription.afterSequence; let disposed = false
  if (after > trace.subscription.snapshotSequence) errors.push('after exceeds snapshot watermark')
  for (const current of trace.pages) {
    if (!sameBinding(current.subscription.binding, trace.subscription.binding) || current.subscription.generation !== trace.subscription.generation || current.subscription.subscriptionId !== trace.subscription.subscriptionId || current.subscription.afterSequence !== trace.subscription.afterSequence || current.subscription.snapshotSequence !== trace.subscription.snapshotSequence) errors.push('page subscription descriptor drift')
    if (current.afterSequence !== after) errors.push('page cursor is not serialized')
    if (after < current.subscription.snapshotSequence && current.phase !== 'replay') errors.push('live precedes replay watermark')
    if (disposed || current.updates.some(update => update.kind === 'disposed') && current.hasMore) errors.push('terminal stream has later page')
    let sequence = after + 1
    for (const update of current.updates) {
      if (disposed) errors.push('update follows terminal disposal')
      if (update.sequence !== sequence) errors.push('update sequence is not monotonic')
      sequence += 1
      if (update.kind === 'snapshot-replaced') {
        currentSnapshot = update.snapshot
        errors.push(...participantErrors(currentSnapshot.selection, currentSnapshot.items))
      } else if (update.kind === 'item-appended' || update.kind === 'item-updated') {
        errors.push(...participantErrors(currentSnapshot.selection, [update.item]))
      } else if (update.kind === 'disposed') disposed = true
    }
    if (current.nextAfterSequence !== (current.updates.length ? current.updates.at(-1).sequence : after)) errors.push('next cursor drift')
    if (current.phase === 'replay' && !current.hasMore && current.nextAfterSequence !== current.subscription.snapshotSequence) errors.push('replay did not reach watermark')
    after = current.nextAfterSequence
  }
  if (!sameBinding(trace.context.binding, trace.binding) || trace.context.generation !== trace.generation) errors.push('command context drift')
  return errors
}
const trace = { binding: snapshot.binding, generation: 'generation-1', snapshot, result, subscription, pages: [page], context }
assert.deepEqual(traceErrors(trace), [])
for (const mutate of [x => { x.result.subscription.generation = 'other' }, x => { x.pages[0].subscription = { ...x.pages[0].subscription, subscriptionId: 'stale-subscription' } }, x => { x.pages[0].subscription = { ...x.pages[0].subscription, afterSequence: 0 } }, x => { x.pages[0].subscription = { ...x.pages[0].subscription, generation: 'other' } }, x => { x.pages[0].updates[0].sequence = 2 }, x => { x.pages[0].phase = 'live' }, x => { x.context.generation = 'stale' }, x => { x.snapshot.items[0].author = { ...x.snapshot.items[0].author, avatar: { kind: 'asset', ref: 'asset:different-avatar' } } }, x => { x.snapshot.selection.participants = [] }, x => { x.pages[0].updates = [{ kind: 'disposed', sequence: 0, reason: 'explicit' }, { kind: 'item-appended', sequence: 1, item }]; x.pages[0].nextAfterSequence = 1 }]) { const bad = structuredClone(trace); mutate(bad); assert.notDeepEqual(traceErrors(bad), [], 'identity/order/terminal no-op mutant must leak') }
for (const wire of [{ ...result, status: 'denied', code: 'policy-denied', subscription: undefined }, { ...result, status: 'unavailable', code: 'disposed', subscription: undefined }, { ...result, status: 'denied', code: 'allowed', subscription: undefined }]) assert.equal(v['agent-conversation-shell-result.v1.schema.json'](wire), wire.code !== 'allowed')
for (const token of ['draft-changed', 'image', 'html', 'css', 'component', 'callback', 'selector', 'projection', 'fixture', 'avatarurl', 'avatarpath', 'avatardata', 'avatarblob']) assert.ok(!JSON.stringify([...schemas.values()]).toLowerCase().includes(token), `forbidden ${token}`)
console.log('Agent conversation shell conformance: all vectors passed')
