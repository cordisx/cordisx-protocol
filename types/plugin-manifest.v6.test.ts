import type {
  PluginManifestAgentRuntimeCapabilityDeclarationV6,
  PluginManifestHostRouteSessionScopeBindingV6,
  PluginManifestSessionScopeDeclarationV6,
  PluginRuntimeManifestV6,
} from './plugin-manifest.v6.js'

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
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v6.schema.json',
  schemaVersion: 6,
  id: 'chatroom',
  capabilities: [approvalRequest],
  services: [],
} satisfies PluginRuntimeManifestV6

manifest.capabilities[0].name satisfies string
exactRouteScope.param satisfies 'sessionId'
exactRouteScope satisfies PluginManifestSessionScopeDeclarationV6
