export type SemanticIconKey =
  | 'action.add' | 'action.back' | 'action.close' | 'action.copy'
  | 'action.delete' | 'action.edit' | 'action.external-link' | 'action.more'
  | 'action.open' | 'action.refresh' | 'action.reset' | 'action.save'
  | 'action.search' | 'action.settings' | 'action.share' | 'agent.reasoning'
  | 'content.calendar' | 'content.clock' | 'content.files' | 'content.folder'
  | 'content.key' | 'content.layers' | 'content.palette' | 'content.panel'
  | 'content.tags' | 'control.check' | 'control.chevron-down'
  | 'control.chevron-left' | 'control.chevron-right' | 'control.chevron-up'
  | 'control.minus' | 'control.plus' | 'navigation.about'
  | 'navigation.channels' | 'navigation.dashboard' | 'navigation.extensions'
  | 'navigation.history' | 'navigation.launcher' | 'navigation.marketplace'
  | 'navigation.overview' | 'navigation.plugins' | 'navigation.routes'
  | 'navigation.runtime' | 'navigation.store' | 'status.error' | 'status.info'
  | 'status.pending' | 'status.success' | 'status.warning'

export type IconVariant = 'regular' | 'filled' | 'duotone'
export type IconState = 'default' | 'hover' | 'active' | 'selected' | 'disabled' | 'danger' | 'success' | 'warning'

export interface IconThemeProviderIdentity {
  providerId: `builtin:${string}` | `plugin:${string}:${string}`
  namespace: string
  protocolVersion: 1
  providerVersion: string
}

export interface IconThemeProviderReference extends IconThemeProviderIdentity {
  providerHandle: `iph_${string}`
  providerGeneration: string
}

export interface PinnedIconThemeProviderReference extends IconThemeProviderReference {
  profileRevision: number
}

export type IconThemeCoverage =
  | {
      kind: 'complete'
      proof: {
        kind: 'host-conformance'
        proofId: string
        catalogVersion: 1
        catalogDigest: 'sha256:719bf30def3e84b716cba18b9497bc58f496c2185d5be53a3ad1ea7c44e7d565'
        providerId: `builtin:${string}` | `plugin:${string}:${string}`
        namespace: string
        providerVersion: string
        providerGeneration: string
        protocolVersion: 1
        descriptorFormatVersion: 1
        keyCount: 49
        variantCount: 3
        stateCount: 8
        tupleCount: 1176
        outcome: 'passed'
        rawDataExported: false
      }
    }
  | {
      kind: 'partial'
      entries: ReadonlyArray<{
        key: SemanticIconKey
        variant: IconVariant
        state: IconState
      }>
    }

export type NormalizedVectorCommand =
  | { op: 'move' | 'line'; x: number; y: number }
  | { op: 'cubic'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'quadratic'; x1: number; y1: number; x: number; y: number }
  | { op: 'close' }

export type NormalizedVectorPath =
  | {
      paint: 'fill'
      fillRule?: 'nonzero' | 'evenodd'
      opacity?: number
      commands: ReadonlyArray<NormalizedVectorCommand>
    }
  | {
      paint: 'stroke'
      strokeWidth: number
      lineCap: 'butt' | 'round' | 'square'
      lineJoin: 'miter' | 'round' | 'bevel'
      opacity?: number
      commands: ReadonlyArray<NormalizedVectorCommand>
    }

export interface NormalizedVectorDescriptor {
  format: 'cordisx.normalized-vector'
  formatVersion: 1
  viewBox: { minX: 0; minY: 0; width: 24; height: 24 }
  paths: ReadonlyArray<NormalizedVectorPath>
}

export interface IconThemeProviderRegistration {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-provider-registration.v1.schema.json'
  schemaVersion: 1
  authority: 'host'
  hostGeneration: string
  revision: number
  providerHandle: `iph_${string}`
  principal:
    | { kind: 'host' }
    | { kind: 'plugin'; principalHandle: `ipp_${string}`; pluginId: string }
  identity: IconThemeProviderIdentity
  providerGeneration: string
  status: 'staged' | 'ready' | 'active' | 'retiring' | 'failed' | 'disposed'
  coverage: IconThemeCoverage
  lastGoodGeneration?: string
  failureCode?: 'prepare-failed' | 'resolution-failed' | 'invalid-descriptor' | 'disposed' | 'generation-replaced'
}

export interface IconThemeSelection {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-selection.v1.schema.json'
  schemaVersion: 1
  authority: 'host'
  profileId: string
  profileRevision: number
  hostGeneration: string
  requestedProviderHandle?: `iph_${string}`
  defaultProvider: PinnedIconThemeProviderReference & { providerId: 'builtin:reicon'; namespace: 'reicon' }
  selectedProvider: PinnedIconThemeProviderReference
  fallbackProvider: PinnedIconThemeProviderReference & { providerId: 'builtin:reicon'; namespace: 'reicon' }
  outcome: 'default' | 'selected' | 'rolled-back'
  reason: 'user-selection' | 'host-default' | 'provider-unavailable' | 'prepare-failed' | 'resolution-failed' | 'invalid-descriptor'
}

export interface IconThemeResolutionRequest {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-resolution-request.v1.schema.json'
  schemaVersion: 1
  requestId: string
  hostGeneration: string
  providerHandle: `iph_${string}`
  providerGeneration: string
  key: SemanticIconKey
  variant: IconVariant
  state: IconState
}

export type IconThemeResolutionResult =
  | {
      $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-resolution-result.v1.schema.json'
      schemaVersion: 1
      requestId: string
      providerGeneration: string
      outcome: 'resolved'
      descriptor: NormalizedVectorDescriptor
    }
  | {
      $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-resolution-result.v1.schema.json'
      schemaVersion: 1
      requestId: string
      providerGeneration: string
      outcome: 'missing' | 'rejected' | 'stale-generation'
      reason: 'not-covered' | 'unsupported-variant' | 'unsupported-state' | 'invalid-request' | 'provider-unavailable' | 'generation-mismatch'
    }

export interface IconThemeLifecycleOperation {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-lifecycle-operation.v1.schema.json'
  schemaVersion: 1
  authority: 'host'
  requestId: string
  profileId: string
  expectedProfileRevision: number
  hostGeneration: string
  operation:
    | {
        kind: 'register'
        providerHandle: `iph_${string}`
        principal: { principalHandle: `ipp_${string}`; pluginId: string }
        identity: IconThemeProviderIdentity
        providerGeneration: string
        coverage: IconThemeCoverage
      }
    | { kind: 'select' | 'dispose'; providerHandle: `iph_${string}`; providerGeneration: string }
    | {
        kind: 'rollback'
        failedProviderHandle: `iph_${string}`
        failedGeneration: string
        restoreProviderHandle: `iph_${string}`
        restoreGeneration: string
        reason?: 'prepare-failed' | 'resolution-failed' | 'invalid-descriptor' | 'provider-unavailable'
      }
}

export interface IconThemeLifecycleResult {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/icon-theme-lifecycle-result.v1.schema.json'
  schemaVersion: 1
  authority: 'host'
  requestId: string
  profileId: string
  operation: 'register' | 'select' | 'dispose' | 'rollback'
  outcome: 'staged' | 'applied' | 'conflict' | 'rejected' | 'rolled-back' | 'rollback-failed'
  profileRevision: number
  hostGeneration: string
  activeProvider: IconThemeProviderReference
  affectedProviderHandle?: `iph_${string}`
  disposedGeneration?: string
  error?: {
    code: 'stale-revision' | 'stale-host-generation' | 'unknown-provider' | 'stale-provider-generation' | 'provider-selected' | 'identity-mismatch' | 'namespace-conflict' | 'prepare-failed' | 'resolution-failed' | 'invalid-descriptor' | 'dispose-failed' | 'rollback-failed'
  }
}
