import type {
  AgentTaskAnswerCapabilityV1,
  AgentTaskApprovalAuthorityLeaseV1,
  AgentTaskPermissionSourceV1,
  AgentTaskRequestCapabilityV1,
} from './agent-task-permission.v1.js'
import type { PluginRuntimeManifestV12 } from './plugin-manifest.v12.js'
import type { PluginRuntimeManifestV11 } from './plugin-manifest.v11.js'
import type { PluginRuntimePackageV12 } from './plugin-package.v12.js'
const task = { kind: 'agent-task-command', commandId: 'chatroom' } as const
const route = { kind: 'host-route-param', routeId: 'detail', param: 'sessionId' } as const
const request: AgentTaskRequestCapabilityV1 = {
  name: 'approvals.request',
  required: false,
  scope: { task, sessionIds: route },
}
const answer: AgentTaskAnswerCapabilityV1 = {
  name: 'approvals.answer',
  required: false,
  scope: { taskRequester: task, authorityRequester: { kind: 'approval-authority-requester-route', requester: route } },
}
const manifest: PluginRuntimeManifestV12 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v12.schema.json',
  schemaVersion: 12,
  id: 'chatroom',
  capabilities: [request, answer, { name: 'usage.read', required: false, scope: { profile: 'current' } }],
  services: [],
}
const previous: PluginRuntimeManifestV11['capabilities'][number] = {
  name: 'approvals.request',
  required: false,
  // @ts-expect-error v11 does not silently accept task capabilities
  scope: { task },
}
// @ts-expect-error task approvals are optional features
const required: AgentTaskRequestCapabilityV1 = { name: 'approvals.request', required: true, scope: { task } }
// @ts-expect-error answer uses taskRequester, never the request task field
const swapped: AgentTaskAnswerCapabilityV1 = { name: 'approvals.answer', required: false, scope: { task } }
declare const source: AgentTaskPermissionSourceV1
declare const lease: AgentTaskApprovalAuthorityLeaseV1
declare const pkg: PluginRuntimePackageV12
const registration: string = source.taskRegistrationId
const resolver: string = lease.registrationId
const version: 12 = pkg.schemaVersion
void [manifest, previous, required, swapped, registration, resolver, version]

const crossRequest: AgentTaskRequestCapabilityV1 = {
  name: 'approvals.request',
  required: false,
  // @ts-expect-error task request cannot borrow an authority-route selector
  scope: { task, authorityRequester: { kind: 'approval-authority-requester-route', requester: route } },
}
const crossAnswer: AgentTaskAnswerCapabilityV1 = {
  name: 'approvals.answer',
  required: false,
  // @ts-expect-error task authority cannot borrow a request-route selector
  scope: { taskRequester: task, sessionIds: route },
}
void [crossRequest, crossAnswer]
