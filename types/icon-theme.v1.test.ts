import type {
  IconThemeLifecycleOperation,
  IconThemeProviderRegistration,
  IconThemeResolutionRequest,
  IconThemeResolutionResult,
  IconThemeSelection,
  NormalizedVectorDescriptor,
} from './icon-theme.v1.js'

const reicon = {
  providerHandle: 'iph_reicon0000000001',
  providerId: 'builtin:reicon',
  namespace: 'reicon',
  protocolVersion: 1,
  providerVersion: '1.0.0',
  providerGeneration: 'reicon-1',
} as const

const registration = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-provider-registration.v1.schema.json',
  schemaVersion: 1,
  authority: 'host',
  hostGeneration: 'host-12',
  revision: 4,
  providerHandle: 'iph_reicon0000000001',
  principal: { kind: 'host' },
  identity: { providerId: 'builtin:reicon', namespace: 'reicon', protocolVersion: 1, providerVersion: '1.0.0' },
  providerGeneration: 'reicon-1',
  status: 'active',
  coverage: { kind: 'complete' },
} satisfies IconThemeProviderRegistration

const selection = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-selection.v1.schema.json',
  schemaVersion: 1,
  authority: 'host',
  profileId: 'work',
  hostGeneration: 'host-12',
  revision: 4,
  defaultProvider: reicon,
  selectedProvider: reicon,
  fallbackProvider: reicon,
  outcome: 'default',
  reason: 'host-default',
} satisfies IconThemeSelection

const request = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-resolution-request.v1.schema.json',
  schemaVersion: 1,
  requestId: 'resolve_request_0001',
  hostGeneration: 'host-12',
  providerHandle: 'iph_reicon0000000001',
  providerGeneration: 'reicon-1',
  key: 'action.save',
  variant: 'regular',
  state: 'default',
} satisfies IconThemeResolutionRequest

const descriptor = {
  format: 'cordisx.normalized-vector',
  formatVersion: 1,
  viewBox: { minX: 0, minY: 0, width: 24, height: 24 },
  paths: [{ paint: 'fill', commands: [{ op: 'move', x: 2, y: 2 }, { op: 'line', x: 22, y: 22 }] }],
} satisfies NormalizedVectorDescriptor

const result = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-resolution-result.v1.schema.json',
  schemaVersion: 1,
  requestId: 'resolve_request_0001',
  providerGeneration: 'reicon-1',
  outcome: 'resolved',
  descriptor,
} satisfies IconThemeResolutionResult

const rollback = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-lifecycle-operation.v1.schema.json',
  schemaVersion: 1,
  authority: 'host',
  requestId: 'lifecycle_rollback_01',
  profileId: 'work',
  expectedRevision: 8,
  hostGeneration: 'host-12',
  operation: {
    kind: 'rollback',
    failedProviderHandle: 'iph_aurora0000000001',
    failedGeneration: 'aurora-3',
    restoreProviderHandle: 'iph_reicon0000000001',
    restoreGeneration: 'reicon-1',
    reason: 'invalid-descriptor',
  },
} satisfies IconThemeLifecycleOperation

const forbiddenDescriptor: NormalizedVectorDescriptor = {
  format: 'cordisx.normalized-vector',
  formatVersion: 1,
  viewBox: { minX: 0, minY: 0, width: 24, height: 24 },
  paths: [],
  // @ts-expect-error raw SVG is not part of the normalized descriptor
  svg: '<svg />',
}

void registration
void selection
void request
void result
void rollback
void forbiddenDescriptor
