import type {
  ApprovalAgentBinding,
  ApprovalAgentTarget,
  ApprovalReason,
  ApprovalService as ApprovalServiceV2,
} from './approval.v2.js'
import type { PluginOwnerIdentity, ToolCallId } from './sessions.v1.js'

export * from './approval.v2.js'

/** Host-stamped identity for one requester-bound pre-persistence resolver. */
export interface ApprovalRequestRoutingRegistration {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-routing-registration.v1.schema.json'
  readonly contract: 'cordisx.approval-request-routing-registration/v1'
  readonly schemaVersion: 1
  readonly registrationId: string
  readonly owner: PluginOwnerIdentity
  readonly requester: ApprovalAgentBinding
}

/** Clone-safe question emitted before any approval fact is persisted. */
export interface ApprovalRequestRoutingQuestion {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-routing-question.v1.schema.json'
  readonly contract: 'cordisx.approval-request-routing-question/v1'
  readonly schemaVersion: 1
  readonly routingId: string
  readonly registration: ApprovalRequestRoutingRegistration
  readonly requester: ApprovalAgentBinding
  readonly toolName: string
  readonly callId?: ToolCallId
  readonly reason: ApprovalReason
}

type ApprovalRequestRoutingResultEnvelope = {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-routing-result.v1.schema.json'
  readonly contract: 'cordisx.approval-request-routing-result/v1'
  readonly schemaVersion: 1
  readonly routingId: string
  readonly registration: ApprovalRequestRoutingRegistration
}

/**
 * Accepted bindings identify exact live handles; Host resolves and verifies
 * them before constructing the existing approval/v2 request.
 */
export type ApprovalRequestRoutingResult = ApprovalRequestRoutingResultEnvelope & (
  | {
    readonly status: 'accepted'
    readonly code: 'routed'
    readonly requester: ApprovalAgentBinding
    readonly authority: ApprovalAgentBinding
  }
  | {
    readonly status: 'unavailable'
    readonly code: 'mapping-unavailable' | 'authority-unavailable'
    readonly requester?: never
    readonly authority?: never
  }
)

export type ApprovalRequestResolver = (
  question: ApprovalRequestRoutingQuestion,
  signal: AbortSignal,
) => ApprovalRequestRoutingResult | Promise<ApprovalRequestRoutingResult>

export interface ApprovalRequestResolverClosed {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/approval-request-resolver-close.v1.schema.json'
  readonly contract: 'cordisx.approval-request-resolver-close/v1'
  readonly schemaVersion: 1
  readonly registration: ApprovalRequestRoutingRegistration
  readonly status: 'closed'
  readonly code: 'disposed' | 'requester-replaced' | 'plugin-generation-replaced' | 'permission-revoked' | 'connection-replaced'
}

declare const approvalRequestResolverCapability: unique symbol

export interface ApprovalRequestResolverHandle {
  readonly registration: ApprovalRequestRoutingRegistration
  readonly closed: Promise<ApprovalRequestResolverClosed>
  readonly [approvalRequestResolverCapability]: never
  dispose(): Promise<ApprovalRequestResolverClosed>
}

export type ApprovalRequestResolverRegisterResult =
  | { readonly status: 'registered'; readonly handle: ApprovalRequestResolverHandle }
  | { readonly status: 'denied'; readonly code: 'permission-denied' | 'not-owner' }
  | {
    readonly status: 'unavailable'
    readonly code: 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'host-unavailable' | 'unsupported'
  }

/**
 * Additive approval/v3 service. Registration is accepted only for a requester
 * Agent owned by the bound plugin and authorized for approvals.request on that
 * exact Session. The Host owns connection identity and never accepts it from
 * request or resolution data.
 */
export interface ApprovalService extends ApprovalServiceV2 {
  registerRequestResolver(
    requester: ApprovalAgentTarget,
    resolver: ApprovalRequestResolver,
  ): Promise<ApprovalRequestResolverRegisterResult>
}
