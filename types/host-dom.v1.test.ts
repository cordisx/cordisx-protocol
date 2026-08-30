import type { BoundHostDomClient, HostDomBridgeRequest, HostDomHandle, HostDomNodeRef } from '@cordisx/protocol/host-dom/v1'

declare const client: BoundHostDomClient
declare const handle: HostDomHandle
declare const node: HostDomNodeRef

const acquire = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/host-dom-bridge-request.v1.schema.json',
  contract: 'cordisx.bound-host-dom/v1', schemaVersion: 1, requestId: 'request-1', type: 'acquire',
  capability: 'ui.host-dom.read', rootId: 'workspace.composer', operations: ['inspect-structure', 'read-text'],
} as const satisfies HostDomBridgeRequest

const modify = {
  $schema: acquire.$schema, contract: acquire.contract, schemaVersion: 1, requestId: 'request-2', type: 'modify', handle, node,
  operation: 'insert-owned-structured-child', child: { id: 'retry', kind: 'action', label: { key: 'retry.label', fallback: 'Retry' }, command: { id: 'retry' } },
} as const satisfies HostDomBridgeRequest

const modifyRoot = {
  $schema: acquire.$schema, contract: acquire.contract, schemaVersion: 1, requestId: 'request-3', type: 'modify', handle,
  operation: 'focus',
} as const satisfies HostDomBridgeRequest

await client.request(acquire)
const result = await client.request(modify)
await client.request(modifyRoot)
if (result.status === 'accepted' && result.type === 'modify') result.operation satisfies 'set-text' | 'set-attribute' | 'insert-owned-structured-child' | 'remove-owned-child' | 'focus'

// @ts-expect-error selectors are never part of the bound request contract
const selector: HostDomBridgeRequest = { ...acquire, selector: '#composer' }
// @ts-expect-error raw HTML is never accepted as a structured child
const rawHtml: HostDomBridgeRequest = { ...modify, child: { id: 'raw', kind: 'html', html: '<script />' } }
// @ts-expect-error role is readable but not mutable
const roleMutation: HostDomBridgeRequest = { ...modify, operation: 'set-attribute', attribute: 'role', value: 'button' }
// @ts-expect-error plugin code cannot supply a principal or profile binding
const forgedOwner: HostDomBridgeRequest = { ...acquire, profileId: 'work', principalHandle: 'plugin-1' }
// @ts-expect-error one handle acquisition cannot mix read and modify leases
const mixedLease: HostDomBridgeRequest = { ...acquire, operations: ['read-text', 'set-text'] }
// @ts-expect-error null is not an opaque node reference and cannot mean the acquired root
const nullNode: HostDomBridgeRequest = { ...modifyRoot, node: null }
// @ts-expect-error raw objects are never accepted as node references
const rawNode: HostDomBridgeRequest = { ...modifyRoot, node: { id: 'root' } }
// @ts-expect-error selectors cannot replace the optional opaque node reference
const selectorTarget: HostDomBridgeRequest = { ...modifyRoot, selector: '#composer' }

void selector
void rawHtml
void roleMutation
void forgedOwner
void mixedLease
void nullNode
void rawNode
void selectorTarget
