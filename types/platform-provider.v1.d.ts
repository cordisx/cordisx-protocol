import type { Context } from '@deepseek-ai/cordis'

export type PlatformProviderJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly PlatformProviderJsonValue[]
  | { readonly [key: string]: PlatformProviderJsonValue }

export interface PlatformProviderOwnerV1 {
  readonly ownerHandle: `ppo_${string}`
  readonly pluginId: string
  readonly serviceId: string
  readonly sourceDigest: `sha256:${string}`
  readonly hostGeneration: string
  readonly pluginGeneration: string
}

export type PlatformProviderOperationV1 =
  | 'models.list'
  | 'sessions.list'
  | 'sessions.read'
  | 'sessions.create'
  | 'sessions.control'
  | 'turns.submit'
  | 'turns.control'
  | 'turns.introduce'
  | 'approvals.decide'

export interface PlatformProviderDescriptorV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-descriptor.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-descriptor/v1'
  readonly schemaVersion: 1
  readonly providerId: string
  readonly displayName: string
  readonly implementationStatus: 'implemented' | 'verified' | 'experimental' | 'unavailable'
  readonly operations: readonly [PlatformProviderOperationV1, ...PlatformProviderOperationV1[]]
}

export interface PlatformProviderModelMappingV1 {
  readonly sourceModelId: string
  readonly modelId: string
  readonly displayName?: string
  readonly enabled: boolean
  readonly isDefault: boolean
}

export interface PlatformProviderMappingV1 {
  readonly models: readonly PlatformProviderModelMappingV1[]
}

export interface PlatformProviderFactoryConfigurationV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-factory-configuration.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-factory-configuration/v1'
  readonly schemaVersion: 1
  readonly configurationRevision: number
  readonly providerId: string
  readonly displayName: string
  readonly enabled: boolean
  readonly requestTimeoutMs: number
}

export interface PlatformProviderRegistrationProjectionV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-registration.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-registration/v1'
  readonly schemaVersion: 1
  readonly registrationId: `ppr_${string}`
  readonly owner: PlatformProviderOwnerV1
  readonly descriptor: PlatformProviderDescriptorV1
  readonly mapping: PlatformProviderMappingV1
  readonly providerGeneration: string
  readonly brokerPolicy: PlatformProviderBrokerPolicyV1
  readonly configuration: PlatformProviderFactoryConfigurationV1
  readonly state: 'staged' | 'ready' | 'active' | 'draining' | 'failed' | 'disposed'
}

export interface PlatformProviderModelRefV1 {
  readonly providerId: string
  readonly modelId: string
}

export interface PlatformProviderSessionRefV1 {
  readonly providerId: string
  readonly remoteSessionId: string
}

/** Host-issued workspace authority; the plugin never receives its filesystem path. */
export interface PlatformProviderWorkspaceRefV1 {
  readonly workspaceHandle: `ppw_${string}`
}

export interface PlatformProviderModelV1 {
  readonly ref: PlatformProviderModelRefV1
  readonly label: string
  readonly isDefault?: boolean
  readonly capabilities?: readonly string[]
}

export interface PlatformProviderSessionV1 {
  readonly ref: PlatformProviderSessionRefV1
  readonly model: PlatformProviderModelRefV1
  readonly state: 'active' | 'archived' | 'deleted' | 'unknown'
  readonly title?: string
  readonly workspace: PlatformProviderWorkspaceRefV1
  readonly createdAt?: string
  readonly updatedAt?: string
}

export interface PlatformProviderTurnV1 {
  readonly turnId: string
  readonly state: 'in-progress' | 'completed' | 'interrupted' | 'failed' | 'unknown'
  readonly items: readonly {
    readonly itemId: string
    readonly kind: 'user-message' | 'assistant-message' | 'reasoning' | 'tool' | 'unknown'
    readonly text?: string
  }[]
}

export interface PlatformProviderSessionDetailV1 extends PlatformProviderSessionV1 {
  readonly turns: readonly PlatformProviderTurnV1[]
}

export type PlatformProviderResultV1<Value> =
  | { readonly ok: true; readonly value: Value }
  | {
    readonly ok: false
    readonly error: {
      readonly code:
        | 'provider-unavailable'
        | 'session-not-found'
        | 'unsupported'
        | 'timeout'
        | 'rejected'
        | 'adapter-failure'
        | 'stale-generation'
        | 'disposed'
      readonly message: string
      readonly retryable?: boolean
    }
  }

export interface PlatformProviderBrokerRequestV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-request.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-broker-request/v1'
  readonly schemaVersion: 1
  readonly requestId: string
  readonly operation: PlatformProviderOperationV1
  readonly method: string
  readonly requestSchema: PlatformProviderBrokerValueSchemaV1
  readonly params: PlatformProviderJsonValue
}

export type PlatformProviderBrokerResultV1 =
  | {
    readonly $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-result.v1.schema.json'
    readonly contract: 'cordisx.platform-provider-broker-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly operation: PlatformProviderOperationV1
    readonly method: string
    readonly status: 'accepted'
    readonly resultSchema: PlatformProviderBrokerValueSchemaV1
    readonly value: PlatformProviderJsonValue
  }
  | {
    readonly $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-result.v1.schema.json'
    readonly contract: 'cordisx.platform-provider-broker-result/v1'
    readonly schemaVersion: 1
    readonly requestId: string
    readonly operation: PlatformProviderOperationV1
    readonly method: string
    readonly status: 'rejected' | 'unavailable'
    readonly code:
      | 'invalid-request'
      | 'method-not-declared'
      | 'operation-not-declared'
      | 'schema-mismatch'
      | 'timeout'
      | 'provider-unavailable'
      | 'stale-generation'
      | 'disposed'
  }

export interface PlatformProviderBrokerEventV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-event.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-broker-event/v1'
  readonly schemaVersion: 1
  readonly eventId: string
  readonly sequence: number
  readonly operation: PlatformProviderOperationV1
  readonly method: string
  readonly eventSchema: PlatformProviderBrokerValueSchemaV1
  readonly payload: PlatformProviderJsonValue
  readonly responseRequired: boolean
}

export interface PlatformProviderBrokerResponseV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-response.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-broker-response/v1'
  readonly schemaVersion: 1
  readonly eventId: string
  readonly operation: PlatformProviderOperationV1
  readonly method: string
  readonly responseSchema: PlatformProviderBrokerValueSchemaV1
  readonly value: PlatformProviderJsonValue
}

export type PlatformProviderBrokerValueSchemaV1 =
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-value.v1.schema.json'

export type PlatformProviderBrokerBindingV1 =
  | {
    readonly operation: PlatformProviderOperationV1
    readonly direction: 'request'
    readonly method: string
    readonly requestSchema: PlatformProviderBrokerValueSchemaV1
    readonly resultSchema: PlatformProviderBrokerValueSchemaV1
  }
  | {
    readonly operation: PlatformProviderOperationV1
    readonly direction: 'event'
    readonly method: string
    readonly eventSchema: PlatformProviderBrokerValueSchemaV1
    readonly responseSchema: PlatformProviderBrokerValueSchemaV1
  }

export interface PlatformProviderBrokerDeclarationV1 {
  readonly bindings: readonly [PlatformProviderBrokerBindingV1, ...PlatformProviderBrokerBindingV1[]]
}

export interface PlatformProviderBrokerPolicyV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-policy.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-broker-policy/v1'
  readonly schemaVersion: 1
  /** Host-supported operation/method/schema catalog selected for this service kind. */
  readonly catalogDigest: `sha256:${string}`
  readonly policyDigest: `sha256:${string}`
  readonly brokerHandle: `ppb_${string}`
  readonly owner: PlatformProviderOwnerV1
  readonly providerId: string
  readonly providerGeneration: string
  readonly bindings: readonly [PlatformProviderBrokerBindingV1, ...PlatformProviderBrokerBindingV1[]]
}

export interface PlatformProviderBrokerSubscriptionV1 {
  readonly subscriptionId: `ppbs_${string}`
  unsubscribe(): void
}

export interface PlatformProviderBrokerV1 {
  readonly policy: PlatformProviderBrokerPolicyV1
  exchange(request: PlatformProviderBrokerRequestV1, signal?: AbortSignal): Promise<PlatformProviderBrokerResultV1>
  subscribe(
    operations: readonly [PlatformProviderOperationV1, ...PlatformProviderOperationV1[]],
    listener: (event: PlatformProviderBrokerEventV1) => void | Promise<void>,
  ): PlatformProviderBrokerSubscriptionV1
  respond(response: PlatformProviderBrokerResponseV1): Promise<'accepted' | 'stale' | 'rejected'>
}

export interface PlatformProviderAdapterFactoryInputV1 {
  readonly owner: PlatformProviderOwnerV1
  readonly providerId: string
  readonly providerGeneration: string
  /** Closed Host projection with no endpoint, credential, process, path, or transport field. */
  readonly configuration: PlatformProviderFactoryConfigurationV1
  readonly broker: PlatformProviderBrokerV1
  readonly signal: AbortSignal
}

interface PlatformProviderLifecycleEventEnvelopeV1 {
  readonly $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-lifecycle-event.v1.schema.json'
  readonly contract: 'cordisx.platform-provider-lifecycle-event/v1'
  readonly schemaVersion: 1
  readonly eventId: string
  readonly sequence: number
  readonly providerId: string
  readonly providerGeneration: string
  readonly session: PlatformProviderSessionRefV1
  readonly turnId: string
}

type PlatformProviderOutputV1 = readonly { readonly type: 'text'; readonly text: string }[]
type PlatformProviderFailureV1 = { readonly code: string; readonly retryable: boolean }
type PlatformProviderApprovalBaseV1 = {
  readonly approvalId: string
  readonly kind: 'command' | 'file-change' | 'external-action' | 'other'
}

export type PlatformProviderLifecycleEventV1 = PlatformProviderLifecycleEventEnvelopeV1 & (
  | {
    readonly type: 'turn.started'
    readonly terminal: false
    readonly output?: never
    readonly failure?: never
    readonly approval?: never
  }
  | {
    readonly type: 'turn.completed'
    readonly terminal: true
    readonly output?: PlatformProviderOutputV1
    readonly failure?: never
    readonly approval?: never
  }
  | {
    readonly type: 'turn.failed'
    readonly terminal: true
    readonly output?: PlatformProviderOutputV1
    readonly failure: PlatformProviderFailureV1
    readonly approval?: never
  }
  | {
    readonly type: 'approval.required'
    readonly terminal: false
    readonly output?: never
    readonly failure?: never
    readonly approval: PlatformProviderApprovalBaseV1 & {
      readonly state: 'pending'
      readonly outcome?: never
    }
  }
  | {
    readonly type: 'approval.resolved'
    readonly terminal: false
    readonly output?: never
    readonly failure?: never
    readonly approval: PlatformProviderApprovalBaseV1 & {
      readonly state: 'resolved'
      readonly outcome: 'approved' | 'denied' | 'expired' | 'cancelled'
    }
  }
)

export interface PlatformProviderAdapterV1 {
  readonly providerId: string
  readonly providerGeneration: string
  readonly models: {
    list(input: { readonly cursor?: string }): Promise<
      PlatformProviderResultV1<{ readonly models: readonly PlatformProviderModelV1[]; readonly nextCursor?: string }>
    >
  }
  readonly sessions: {
    list(input: {
      readonly cursor?: string
      readonly limit: number
      readonly workspace?: PlatformProviderWorkspaceRefV1
      readonly search?: string
    }): Promise<
      PlatformProviderResultV1<{
        readonly sessions: readonly PlatformProviderSessionV1[]
        readonly nextCursor?: string
      }>
    >
    read(ref: PlatformProviderSessionRefV1): Promise<PlatformProviderResultV1<PlatformProviderSessionDetailV1>>
    create(input: {
      readonly model: PlatformProviderModelRefV1
      readonly workspace: PlatformProviderWorkspaceRefV1
      readonly initialMessage?: string
    }): Promise<
      PlatformProviderResultV1<PlatformProviderSessionDetailV1>
    >
    control(input: {
      readonly action: 'continue' | 'fork' | 'archive' | 'restore' | 'delete'
      readonly session: PlatformProviderSessionRefV1
    }): Promise<PlatformProviderResultV1<PlatformProviderSessionV1 | { readonly deleted: true }>>
  }
  readonly turns: {
    submit(input: { readonly session: PlatformProviderSessionRefV1; readonly message: string }): Promise<
      PlatformProviderResultV1<{ readonly turnId: string }>
    >
    control(input: {
      readonly action: 'steer' | 'interrupt'
      readonly session: PlatformProviderSessionRefV1
      readonly turnId: string
      readonly message?: string
    }): Promise<PlatformProviderResultV1<{ readonly turnId: string }>>
    introduce(input: {
      readonly session: PlatformProviderSessionRefV1
      readonly participantId: string
      readonly memberId: string
      readonly runId: string
      readonly operationId: string
      readonly operationDigest: string
    }): Promise<PlatformProviderResultV1<{ readonly turnId: string; readonly messageId: string }>>
  }
  readonly approvals: {
    decide(input: {
      readonly session: PlatformProviderSessionRefV1
      readonly turnId: string
      readonly approvalId: string
      readonly decision: 'approved' | 'denied' | 'cancelled'
      readonly operationId: string
      readonly operationDigest: string
    }): Promise<
      PlatformProviderResultV1<{
        readonly approvalId: string
        readonly decision: 'approved' | 'denied' | 'cancelled'
      }>
    >
  }
  subscribeLifecycle(
    listener: (event: PlatformProviderLifecycleEventV1) => void | Promise<void>,
  ): PlatformProviderLifecycleSubscriptionV1
  /** Wait until every accepted operation and lifecycle delivery reaches a terminal outcome. */
  drain(): Promise<void>
  dispose(reason: 'replaced' | 'disabled' | 'failed' | 'host-disposed'): Promise<void>
}

export interface PlatformProviderLifecycleSubscriptionV1 {
  readonly subscriptionId: `ppls_${string}`
  unsubscribe(): void
}

export type PlatformProviderAdapterFactoryV1 = (
  input: PlatformProviderAdapterFactoryInputV1,
) => Promise<PlatformProviderAdapterV1>

export interface PlatformProviderDefinitionV1 {
  readonly descriptor: PlatformProviderDescriptorV1
  readonly mapping: PlatformProviderMappingV1
  /** Host validates, clones, freezes, and binds this exact method/schema allowlist. */
  readonly brokerRequest: PlatformProviderBrokerDeclarationV1
  readonly createAdapter: PlatformProviderAdapterFactoryV1
}

export interface PlatformProviderRegistrationHandleV1 {
  readonly registration: PlatformProviderRegistrationProjectionV1
  /** Stops admission, drains accepted work, then disposes this generation. */
  dispose(): Promise<void>
}

export interface PlatformProvidersV1 {
  readonly owner: PlatformProviderOwnerV1
  register(definition: PlatformProviderDefinitionV1): Promise<PlatformProviderRegistrationHandleV1>
}

export interface PlatformProviderServiceInputV1 {
  readonly owner: PlatformProviderOwnerV1
  /** Closed per-provider projections derived from the validated service document. */
  readonly configurations: readonly PlatformProviderFactoryConfigurationV1[]
  readonly signal: AbortSignal
}

export type PlatformProviderServiceApplyV1 = (
  ctx: PlatformProviderContextV1,
  input: PlatformProviderServiceInputV1,
) => void | Promise<void>

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Source- and generation-bound launcher-side Platform provider registry. */
    platformProviders: PlatformProvidersV1
  }
}

/** Keeps the Cordis Context augmentation in this public entrypoint's type graph. */
export type PlatformProviderContextV1 = Context
