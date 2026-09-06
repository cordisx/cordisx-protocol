import type { Context } from '@deepseek-ai/cordis'

export interface ChannelAccountRef {
  readonly adapterId: string
  readonly accountId: string
}

export interface ChannelTenantRef extends ChannelAccountRef {
  readonly tenantId: string
}

export interface ChannelConversationRef extends ChannelTenantRef {
  readonly conversationId: string
  readonly kind: 'direct' | 'group' | 'broadcast'
}

export interface ChannelThreadRef extends ChannelConversationRef {
  readonly threadId: string
  readonly semantics: 'conversation' | 'topic' | 'reply-chain'
}

export interface ChannelUserRef extends ChannelTenantRef {
  readonly userId: string
}

export interface ChannelEventRef extends ChannelThreadRef {
  readonly eventId: string
  readonly messageId?: string
  readonly actor?: ChannelUserRef
}

export type ChannelContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | {
    readonly type: 'attachment'
    readonly handle: string
    readonly mediaType: string
    readonly name?: string
    readonly size: number
  }

export interface ChannelUserInput {
  readonly contract: 'cordisx.channel-user-input/v1'
  readonly schemaVersion: 1
  readonly role: 'user'
  readonly content: readonly [ChannelContentBlock, ...ChannelContentBlock[]]
  readonly source: { readonly kind: 'channel'; readonly event: ChannelEventRef }
  readonly receivedAt: string
}

export type ChannelAdapterKind =
  | 'simulator'
  | 'feishu'
  | 'lark'
  | 'wecom-intelligent-bot'
  | 'wecom-enterprise-app'
  | 'wecom-message-push'
  | 'wechat-service'

export type ChannelImplementationStatus =
  | 'implemented'
  | 'verified'
  | 'experimental'
  | 'unavailable'
  | 'planned'

export interface ChannelQueueSnapshot {
  readonly pending: number
  readonly retrying: number
  readonly deadLetter: number
}

export interface ChannelRuntimeAccountSnapshot {
  readonly ref: ChannelTenantRef
  readonly adapterKind: ChannelAdapterKind
  readonly implementationStatus: ChannelImplementationStatus
  readonly connectionState: 'disabled' | 'starting' | 'ready' | 'retrying' | 'unavailable' | 'stopped'
  readonly secretState: 'missing' | 'ready' | 'unavailable'
  readonly generation: number
  readonly lastGoodRevision: number
  readonly cursorUpdatedAt?: string
  readonly lastErrorCode?: string
  readonly inbound: ChannelQueueSnapshot
  readonly outbound: ChannelQueueSnapshot
}

export interface ChannelRuntimeSnapshotV1 {
  readonly contract: 'cordisx.channel-runtime-snapshot/v1'
  readonly schemaVersion: 1
  readonly observedAt: string
  readonly accounts: readonly ChannelRuntimeAccountSnapshot[]
}

export interface ChannelInboundEnvelope {
  readonly input: ChannelUserInput
}

export interface ChannelReceiveReceipt {
  readonly recordId: string
  readonly duplicate: boolean
  readonly status:
    | 'queued'
    | 'processing'
    | 'retrying'
    | 'applied'
    | 'permission-pending'
    | 'denied'
    | 'failed'
    | 'dead-letter'
}

export interface ChannelOutboundDelivery {
  readonly deliveryId: string
  readonly target: ChannelThreadRef
  readonly kind: 'completion' | 'approval' | 'failure' | 'reply'
  readonly text: string
  readonly createdAt: string
}

export interface ChannelSendResult {
  readonly externalMessageId: string
  readonly recallHandle?: string
}

export interface ChannelAdapterDescriptor {
  readonly ref: ChannelTenantRef
  readonly kind: ChannelAdapterKind
  readonly implementationStatus: ChannelImplementationStatus
  readonly configurationRevision: number
  readonly secretState: 'missing' | 'ready' | 'unavailable'
}

export interface ChannelAdapterHost {
  readonly generation: number
  readonly ref: ChannelTenantRef
  receive(envelope: ChannelInboundEnvelope): Promise<ChannelReceiveReceipt>
  drainInbound(limit?: number): Promise<number>
  drainOutbound(limit?: number): Promise<number>
}

export interface ChannelAdapterConnection {
  send(delivery: ChannelOutboundDelivery): Promise<ChannelSendResult>
  stop(reason: 'replaced' | 'disposed' | 'failed'): Promise<void>
}

export interface ChannelAdapterDefinition {
  readonly descriptor: ChannelAdapterDescriptor
  start(host: ChannelAdapterHost): Promise<ChannelAdapterConnection>
}

export interface ChannelAdapterHandle {
  readonly ref: ChannelTenantRef
  readonly generation: number
  receive(envelope: ChannelInboundEnvelope): Promise<ChannelReceiveReceipt>
  drainInbound(limit?: number): Promise<number>
  drainOutbound(limit?: number): Promise<number>
  dispose(): Promise<void>
}

export interface ChannelSubscriptionFilter {
  readonly account: ChannelTenantRef
  readonly conversationId?: string
  readonly userId?: string
}

export interface ChannelMessageEvent {
  readonly delivery: 'live-experimental'
  readonly recordId: string
  readonly input: ChannelUserInput
}

export type ChannelMessageListener = (event: ChannelMessageEvent) => void | Promise<void>

export interface ChannelNotification {
  readonly target: ChannelThreadRef
  readonly kind: ChannelOutboundDelivery['kind']
  readonly text: string
}

export interface ChannelDeliveryHandle {
  readonly deliveryId: string
  cancel(): Promise<'cancelled' | 'irreversible' | 'not-found'>
}

/** Host-stamped service configuration fence. Callers can observe but never replace it. */
export interface ChannelRuntimeConfigurationV1 {
  readonly revision: number
}

export interface ChannelRuntimeV1 {
  readonly configuration: ChannelRuntimeConfigurationV1
  readonly connections: {
    list(): Promise<readonly ChannelRuntimeAccountSnapshot[]>
  }
  readonly adapters: {
    register(definition: ChannelAdapterDefinition): Promise<ChannelAdapterHandle>
  }
  readonly messages: {
    send(notification: ChannelNotification): Promise<ChannelDeliveryHandle>
    subscribe(filter: ChannelSubscriptionFilter, listener: ChannelMessageListener): Promise<() => void>
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Source- and generation-bound launcher-side Channel service. */
    channel: ChannelRuntimeV1
  }
}

/** Keeps the Cordis Context augmentation in this public entrypoint's type graph. */
export type ChannelRuntimeContextV1 = Context
