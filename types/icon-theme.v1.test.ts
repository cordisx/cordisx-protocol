import type {
  IconThemeLifecycleOperation,
  IconThemeProviderRegistration,
  IconThemeResolutionRequest,
  IconThemeResolutionResult,
  IconThemeSelection,
  NormalizedVectorDescriptor,
  SemanticIconKey,
} from './icon-theme.v1.js'

const reicon = {
  providerHandle: 'iph_reicon0000000001',
  providerId: 'builtin:reicon',
  namespace: 'reicon',
  protocolVersion: 1,
  providerVersion: '1.0.0',
  providerGeneration: 'reicon-1',
  profileRevision: 4,
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
  coverage: {
    kind: 'complete',
    proof: {
      kind: 'host-conformance',
      proofId: 'proof_reicon_000001',
      catalogVersion: 1,
      catalogDigest: 'sha256:fabbf2ac3d7177bc353432e4175240cc3fe10d040321e2b785c1da0f77634771',
      providerId: 'builtin:reicon',
      namespace: 'reicon',
      providerVersion: '1.0.0',
      providerGeneration: 'reicon-1',
      protocolVersion: 1,
      descriptorFormatVersion: 1,
      keyCount: 64,
      variantCount: 3,
      stateCount: 8,
      tupleCount: 1536,
      outcome: 'passed',
      rawDataExported: false,
    },
  },
} satisfies IconThemeProviderRegistration

const selection = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-selection.v1.schema.json',
  schemaVersion: 1,
  authority: 'host',
  profileId: 'work',
  hostGeneration: 'host-12',
  profileRevision: 4,
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

const certifiedRequest = {
  ...request,
  requestId: 'resolve_trust_certified_01',
  key: 'trust.certified',
} satisfies IconThemeResolutionRequest

const officialRequest = {
  ...request,
  requestId: 'resolve_trust_official_001',
  key: 'trust.official',
} satisfies IconThemeResolutionRequest

const managerSemanticKeys = [
  'action.move',
  'action.export',
  'action.follow',
  'action.pause',
  'action.resume',
  'action.favorite',
  'action.import',
  'action.enable',
  'action.disable',
  'action.submit',
  'content.contributions',
  'content.acknowledgements',
  'agent.turn-control',
] as const satisfies ReadonlyArray<SemanticIconKey>

// @ts-expect-error favorite-active is the selected state of action.favorite
const forbiddenFavoriteActive: SemanticIconKey = 'action.favorite-active'

const forbiddenAccessibleLabel = {
  ...certifiedRequest,
  // @ts-expect-error accessible text belongs to the Host UI context
  label: 'Certified',
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
  expectedProfileRevision: 8,
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
void certifiedRequest
void officialRequest
void managerSemanticKeys
void forbiddenFavoriteActive
void forbiddenAccessibleLabel
void result
void rollback
void forbiddenDescriptor
