import type { Context } from '@deepseek-ai/cordis'
import type { ChannelAdapterKind, ChannelImplementationStatus, ChannelQueueSnapshot } from './channel-runtime.v1.js'

export type ChannelManagerOpaqueToken = string

export type ChannelManagerRootOperationV2 =
  | 'credential.capture'
  | 'connection.create'
  | 'target.credential.capture.create'
  | 'target.connection.create'
  | 'target.connection.create.simulator'

export type ChannelManagerAccountOperationV2 =
  | 'connection.update'
  | 'connection.rotate-credential'
  | 'connection.enable'
  | 'connection.disable'
  | 'connection.reconnect'
  | 'logs.query'
  | 'logs.export'
  | 'target.credential.capture.rotate'

export type ChannelManagerBindingOperationV2 = 'binding.archive' | 'binding.restore' | 'binding.unbind'

export type ChannelManagerPermissionOperationV2 =
  | 'permission.allow-once'
  | 'permission.allow-persistent'
  | 'permission.deny-once'
  | 'permission.deny-persistent'

export type ChannelManagerOperationV2 =
  | 'credential.capture'
  | 'connection.create'
  | 'connection.update'
  | 'connection.rotate-credential'
  | 'connection.enable'
  | 'connection.disable'
  | 'connection.reconnect'
  | 'binding.open'
  | ChannelManagerBindingOperationV2
  | 'logs.query'
  | 'logs.export'
  | ChannelManagerPermissionOperationV2

export type ChannelManagerTargetIssuanceOperationV1 =
  | 'target.credential.capture.create'
  | 'target.credential.capture.rotate'
  | 'target.connection.create'
  | 'target.connection.create.simulator'

export type ChannelManagerTargetV2 =
  | { readonly kind: 'connection'; readonly connectionToken: ChannelManagerOpaqueToken }
  | { readonly kind: 'connection-draft'; readonly connectionDraftToken: ChannelManagerOpaqueToken }
  | { readonly kind: 'credential-capture'; readonly captureToken: ChannelManagerOpaqueToken }
  | { readonly kind: 'credential-draft'; readonly credentialDraftToken: ChannelManagerOpaqueToken }
  | {
    readonly kind: 'binding'
    readonly bindingToken: ChannelManagerOpaqueToken
    readonly bindingRevision: number
  }
  | { readonly kind: 'log'; readonly connectionToken: ChannelManagerOpaqueToken }
  | { readonly kind: 'permission-request'; readonly permissionRequestToken: ChannelManagerOpaqueToken }

interface ChannelManagerFenceV2 {
  readonly requestId: string
  readonly expectedRevision: number
  readonly profileId: string
  readonly hostGeneration: string
}

export interface ChannelManagerAccountV3 {
  readonly connectionToken: ChannelManagerOpaqueToken
  readonly adapterKind: ChannelAdapterKind
  readonly displayName?: string
  readonly implementationStatus: ChannelImplementationStatus
  readonly connectionState: 'disabled' | 'starting' | 'ready' | 'retrying' | 'unavailable' | 'stopped'
  readonly configurationState: 'ready' | 'incomplete' | 'unavailable'
  readonly generation: number
  readonly lastGoodRevision: number
  readonly cursorUpdatedAt?: string
  readonly lastErrorCode?: string
  readonly inbound: ChannelQueueSnapshot
  readonly outbound: ChannelQueueSnapshot
  readonly availableOperations: readonly ChannelManagerAccountOperationV2[]
}

export interface ChannelManagerBindingV3 {
  readonly bindingToken: ChannelManagerOpaqueToken
  readonly connectionToken: ChannelManagerOpaqueToken
  readonly sessionToken: ChannelManagerOpaqueToken
  readonly routeToken: ChannelManagerOpaqueToken
  readonly bindingRevision: number
  readonly state: 'active' | 'archived' | 'unavailable'
  readonly availableOperations: readonly ChannelManagerBindingOperationV2[]
}

export interface ChannelManagerPendingAuthorizationV3 {
  readonly permissionRequestToken: ChannelManagerOpaqueToken
  readonly capability: string
  readonly state: 'pending'
  readonly availableOperations: readonly ChannelManagerPermissionOperationV2[]
}

export interface ChannelManagerSnapshotV3 {
  readonly contract: 'cordisx.channel-runtime-snapshot/v3'
  readonly schemaVersion: 3
  readonly profileId: string
  readonly hostGeneration: string
  readonly revision: number
  readonly observedAt: string
  readonly availableOperations: readonly ChannelManagerRootOperationV2[]
  readonly accounts: readonly ChannelManagerAccountV3[]
  readonly bindings: readonly ChannelManagerBindingV3[]
  readonly pendingAuthorizations: readonly ChannelManagerPendingAuthorizationV3[]
}

export type ChannelManagerTargetRequestV1 = ChannelManagerFenceV2 & {
  readonly contract: 'cordisx.channel-manager-target-request/v1'
  readonly schemaVersion: 1
} & (
  | {
    readonly operation: 'target.credential.capture.create'
    readonly purpose: 'create'
    readonly adapterKind: Exclude<ChannelAdapterKind, 'simulator'>
    readonly target: { readonly kind: 'root' }
  }
  | {
    readonly operation: 'target.credential.capture.rotate'
    readonly purpose: 'rotate'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'connection' }>
  }
  | {
    readonly operation: 'target.connection.create'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'credential-draft' }>
  }
  | {
    readonly operation: 'target.connection.create.simulator'
    readonly adapterKind: 'simulator'
    readonly target: { readonly kind: 'root' }
  }
)

interface ChannelManagerTargetResultBaseV1 extends ChannelManagerFenceV2 {
  readonly contract: 'cordisx.channel-manager-target-result/v1'
  readonly schemaVersion: 1
  readonly revision: number
  readonly code: string
}

export type ChannelManagerTargetResultV1 = ChannelManagerTargetResultBaseV1 & (
  | {
    readonly operation: 'target.credential.capture.create' | 'target.credential.capture.rotate'
    readonly status: 'applied'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'credential-capture' }>
    readonly expiresAt: string
  }
  | {
    readonly operation: 'target.connection.create' | 'target.connection.create.simulator'
    readonly status: 'applied'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'connection-draft' }>
    readonly expiresAt: string
  }
  | {
    readonly operation: ChannelManagerTargetIssuanceOperationV1
    readonly status: 'conflict' | 'rejected' | 'unavailable'
  }
)

export interface ChannelManagerLogQueryV2 {
  readonly cursor?: string
  readonly limit: number
  readonly filter?: {
    readonly levels?: readonly ('debug' | 'info' | 'warn' | 'error')[]
    readonly events?: readonly (
      | 'connection.started'
      | 'connection.ready'
      | 'connection.retrying'
      | 'connection.stopped'
      | 'connection.rejected'
      | 'binding.created'
      | 'binding.archived'
      | 'binding.restored'
      | 'binding.unbound'
      | 'export.created'
    )[]
  }
}

export type ChannelManagerRequestV2 = ChannelManagerFenceV2 & {
  readonly contract: 'cordisx.channel-manager-request/v2'
  readonly schemaVersion: 2
} & (
  | {
    readonly operation: 'credential.capture'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'credential-capture' }>
  }
  | {
    readonly operation: 'connection.create'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'connection-draft' }>
    readonly draft: { readonly displayName: string; readonly selectors?: readonly ChannelManagerSelectorV2[] }
  }
  | {
    readonly operation: 'connection.rotate-credential'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'connection' }>
    readonly draft: { readonly credentialDraftToken: ChannelManagerOpaqueToken }
  }
  | {
    readonly operation: 'connection.update'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'connection' }>
    readonly patch: { readonly displayName?: string; readonly selectors?: readonly ChannelManagerSelectorV2[] }
  }
  | {
    readonly operation: 'connection.enable' | 'connection.disable' | 'connection.reconnect'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'connection' }>
  }
  | {
    readonly operation: 'binding.open' | ChannelManagerBindingOperationV2
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'binding' }>
  }
  | {
    readonly operation: 'logs.query'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'log' }>
    readonly query: ChannelManagerLogQueryV2
  }
  | {
    readonly operation: 'logs.export'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'log' }>
    readonly query: ChannelManagerLogQueryV2
  }
  | {
    readonly operation: ChannelManagerPermissionOperationV2
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'permission-request' }>
  }
)

export type ChannelManagerSelectorV2 = 'direct' | 'group' | 'mentions' | 'replies'

export interface ChannelManagerSafePermissionReadbackV2 {
  readonly state: 'granted-once' | 'granted-persistent' | 'denied'
  readonly capability: string
}

interface ChannelManagerResultBaseV2 extends ChannelManagerFenceV2 {
  readonly contract: 'cordisx.channel-manager-result/v2'
  readonly schemaVersion: 2
  readonly revision: number
  readonly code: string
}

type ChannelManagerPlainAppliedOperationV2 = Exclude<
  ChannelManagerOperationV2,
  'credential.capture' | 'connection.create' | ChannelManagerPermissionOperationV2
>

export type ChannelManagerResultV2 = ChannelManagerResultBaseV2 & (
  | {
    readonly operation: 'credential.capture'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'credential-capture' }>
    readonly status: 'applied'
    readonly credentialDraftToken: ChannelManagerOpaqueToken
    readonly expiresAt: string
  }
  | {
    readonly operation: 'connection.create'
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'connection-draft' }>
    readonly status: 'applied'
    readonly connectionToken: ChannelManagerOpaqueToken
  }
  | {
    readonly operation: ChannelManagerPermissionOperationV2
    readonly target: Extract<ChannelManagerTargetV2, { kind: 'permission-request' }>
    readonly status: 'applied'
    readonly permission: ChannelManagerSafePermissionReadbackV2
  }
  | {
    readonly operation: ChannelManagerPlainAppliedOperationV2
    readonly target: ChannelManagerTargetV2
    readonly status: 'applied'
  }
  | {
    readonly operation: ChannelManagerOperationV2
    readonly target: ChannelManagerTargetV2
    readonly status: 'conflict' | 'rejected' | 'unavailable'
  }
)

export interface ChannelManagerLogEntryV2 {
  readonly entryId: string
  readonly occurredAt: string
  readonly level: 'debug' | 'info' | 'warn' | 'error'
  readonly event:
    | 'connection.started'
    | 'connection.ready'
    | 'connection.retrying'
    | 'connection.stopped'
    | 'connection.rejected'
    | 'binding.created'
    | 'binding.archived'
    | 'binding.restored'
    | 'binding.unbound'
    | 'export.created'
  readonly code: string
  readonly connectionToken: ChannelManagerOpaqueToken
  readonly bindingToken?: ChannelManagerOpaqueToken
  readonly count?: number
}

export interface ChannelManagerLogPageV2 extends ChannelManagerFenceV2 {
  readonly contract: 'cordisx.channel-manager-log-page/v2'
  readonly schemaVersion: 2
  readonly snapshotRevision: number
  readonly target: Extract<ChannelManagerTargetV2, { kind: 'log' }>
  readonly generatedAt: string
  readonly nextCursor?: string
  readonly entries: readonly ChannelManagerLogEntryV2[]
}

export type ChannelManagerLogExportResultV2 = ChannelManagerFenceV2 & {
  readonly contract: 'cordisx.channel-manager-log-export-result/v2'
  readonly schemaVersion: 2
  readonly target: Extract<ChannelManagerTargetV2, { kind: 'log' }>
  readonly observedAt: string
} & (
  | {
    readonly status: 'created'
    readonly exportId: ChannelManagerOpaqueToken
    readonly mimeType: 'application/json'
    readonly entryCount: number
    readonly expiresAt: string
  }
  | {
    readonly status: 'conflict' | 'rejected' | 'unavailable'
    readonly code: string
    readonly retryable: boolean
  }
)

export interface ChannelManagerSubscriptionV2 {
  dispose(): void
}

/** Public renderer service over the existing Channel Manager wire family. */
export interface ChannelManagerV2 {
  snapshot(): ChannelManagerSnapshotV3
  issue(request: ChannelManagerTargetRequestV1): Promise<ChannelManagerTargetResultV1>
  execute(request: ChannelManagerRequestV2): Promise<ChannelManagerResultV2>
  queryLogs(request: Extract<ChannelManagerRequestV2, { operation: 'logs.query' }>): Promise<ChannelManagerLogPageV2>
  exportLogs(
    request: Extract<ChannelManagerRequestV2, { operation: 'logs.export' }>,
  ): Promise<ChannelManagerLogExportResultV2>
  subscribe(listener: () => void): ChannelManagerSubscriptionV2
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Opaque, revision-fenced renderer projection and operation service. */
    channelManager: ChannelManagerV2
  }
}

/** Keeps the Cordis Context augmentation in this public entrypoint's type graph. */
export type ChannelManagerContextV2 = Context
