import assert from 'node:assert/strict'
import { availability, Reporter, summarize } from './startup-reference-model.mjs'

// Reference-only bounded command outcome; it does not execute or cancel service work.
export function targetOutcome(capability, evidence, options = {}) {
  const action = availability(capability, evidence, options)
  if (action.available) return { status: 'ready' }
  const terminal = new Set([
    'unknown-target',
    'failed',
    'stopped',
    'revoked',
    'authentication-required',
    'catalog-empty',
    'model-unavailable',
    'permission-denied',
    'unsupported',
  ])
  if (terminal.has(action.reason)) return { status: 'unavailable', reason: action.reason }
  return { status: 'waiting', reason: action.reason }
}

export function checkWaitAndRetry(capability, evidence, report) {
  const empty = { ...evidence, catalog: { state: 'known', generation: 'empty', modelIds: [] }, provider: 'unpublished' }
  assert.equal(summarize(capability, empty), 'failed')
  assert.equal(empty.service, 'ready')
  assert.equal(empty.process, 'running')
  assert.deepEqual(targetOutcome(capability, empty), { status: 'unavailable', reason: 'catalog-empty' })
  assert.equal(targetOutcome(capability, evidence, { modelId: 'absent' }).reason, 'model-unavailable')
  assert.equal(targetOutcome(capability, { ...evidence, authentication: 'missing' }).status, 'unavailable')
  assert.equal(targetOutcome(capability, { ...evidence, catalog: { state: 'pending' } }).status, 'waiting')
  assert.equal(summarize(capability, evidence), 'ready', 'new valid discovery recovers without a process restart')
  const owner = { pluginId: capability.pluginId, serviceId: capability.serviceId }
  const old = new Reporter(capability, report.generation)
  assert.equal(old.report(report, owner).status, 'accepted')
  old.revoked = true
  const current = new Reporter(capability, report.generation)
  current.sequences = new Map(old.sequences)
  assert.equal(old.report({ ...report, sequence: 999 }, owner).reason, 'revoked')
  assert.equal(current.report(report, owner).reason, 'stale-sequence')
  assert.equal(current.report({ ...report, sequence: 2 }, owner).status, 'accepted')
  assert.deepEqual(current.generation, old.generation, 'attempt fencing does not restart a shared service')
  const controller = new AbortController()
  let activeAttempt = { controller, completed: false }
  const staleAttempt = activeAttempt
  controller.abort()
  activeAttempt = { controller: new AbortController(), completed: false }
  const complete = attempt => {
    if (attempt !== activeAttempt || attempt.controller.signal.aborted) return false
    attempt.completed = true
    return true
  }
  assert.equal(complete(staleAttempt), false)
  assert.equal(complete(activeAttempt), true)
}
