import type {
  PluginManifestAgentRuntimeCapabilityDeclarationV6,
  PluginManifestHostRouteSessionScopeBindingV6,
  PluginManifestSessionScopeDeclarationV6,
  PluginRuntimeManifestV8,
  PluginApprovalAuthorityCapabilityDeclarationV8,
} from './plugin-manifest.v8.js'

const exactRouteScope = {
  kind: 'host-route-param',
  routeId: 'room-session-detail',
  param: 'sessionId',
} satisfies PluginManifestHostRouteSessionScopeBindingV6

const approvalRequest = {
  name: 'approvals.request',
  required: false,
  scope: { sessionIds: exactRouteScope },
} satisfies PluginManifestAgentRuntimeCapabilityDeclarationV6

const manifest = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v8.schema.json',
  schemaVersion: 8,
  id: 'chatroom',
  capabilities: [approvalRequest],
  services: [],
} satisfies PluginRuntimeManifestV8

const authority = { name: 'approvals.answer', required: false, scope: { authorityRequester: { kind: 'approval-authority-requester-route', requester: exactRouteScope } } } satisfies PluginApprovalAuthorityCapabilityDeclarationV8
authority.scope.authorityRequester.requester.param satisfies 'sessionId'

manifest.capabilities[0].name satisfies string
exactRouteScope.param satisfies 'sessionId'
exactRouteScope satisfies PluginManifestSessionScopeDeclarationV6
