import type { AgentAdmission, AgentHandle } from './agents.v1.js'
import type { AgentBootstrapCommandOrigin } from './agent-admission.v4.js'
import type { MessageId, PluginOwnerIdentity, SessionId } from './sessions.v1.js'

/** Exact same-owner Room route carrying the declared Room id. */
export interface AgentAdmissionBootstrapRoomRoute {
  readonly routeId: string
  readonly param: 'roomId'
  readonly roomId: string
}

/**
 * A newly materialized Room delivery plus the one exact Room route that may
 * receive its source capture. `route.roomId` must equal `roomId`.
 */
export interface AgentAdmissionBootstrapRouteTarget {
  readonly roomId: string
  readonly participantId: string
  readonly memberId: string
  readonly runId: string
  readonly route: AgentAdmissionBootstrapRoomRoute
}

declare const bootstrapRouteContinuationCapability: unique symbol
/** Opaque, Host-issued, command-live continuation for one declared Room target. */
export interface AgentAdmissionBootstrapRouteContinuation {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-route-continuation.v6.schema.json'
  readonly contract: 'cordisx.agent-admission-bootstrap-route-continuation/v6'
  readonly schemaVersion: 6
  readonly token: string
  readonly [bootstrapRouteContinuationCapability]: never
}

export interface AgentAdmissionBootstrapRouteDeclarationRequest {
  readonly origin: AgentBootstrapCommandOrigin
  readonly target: AgentAdmissionBootstrapRouteTarget
}
export type AgentAdmissionBootstrapRouteDeclarationResult =
  | { readonly status: 'declared'; readonly continuation: AgentAdmissionBootstrapRouteContinuation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'room-denied' | 'route-denied' | 'target-denied' | 'command-complete' | 'duplicate-target' | 'cross-room' | 'reused' }
/** Plugin-facing declaration service. It is available only while the originating command is live. */
export interface AgentAdmissionBootstrapRouteDeclarationService {
  declare(request: AgentAdmissionBootstrapRouteDeclarationRequest): Promise<AgentAdmissionBootstrapRouteDeclarationResult>
}

export interface AgentAdmissionBootstrapRouteReservationRequest {
  readonly handle: AgentHandle
  readonly continuation: AgentAdmissionBootstrapRouteContinuation
  readonly message: { readonly text: string }
}
export interface AgentAdmissionBootstrapRouteReservation {
  readonly reservationId: string
  readonly submit: () => Promise<AgentAdmission & { readonly status: 'accepted' }>
  readonly revoke: () => Promise<void>
}
export type AgentAdmissionBootstrapRouteReservationResult =
  | { readonly status: 'reserved'; readonly reservation: AgentAdmissionBootstrapRouteReservation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'target-mismatch' | 'binding-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'command-complete' | 'reused' | 'revoked' }
/** Plugin-facing pre-submit service. It prepares the exact Host source record and commits it only on accepted driver admission. */
export interface AgentAdmissionBootstrapRouteReservationService {
  reserve(request: AgentAdmissionBootstrapRouteReservationRequest): Promise<AgentAdmissionBootstrapRouteReservationResult>
}

/** Host-generated, route-activation binding. Plugins never provide this value. */
export interface AgentAdmissionBootstrapRouteBinding {
  readonly binding: { readonly bindingId: string; readonly ownerGeneration: string }
  readonly generation: string
  readonly route: AgentAdmissionBootstrapRoomRoute
}

/**
 * Host-only rebind input. Every field is obtained from Host-owned admission and
 * routing state; this service is never exposed through a plugin context.
 */
export interface AgentAdmissionBootstrapRouteClaimRequest {
  readonly continuation: AgentAdmissionBootstrapRouteContinuation
  readonly binding: AgentAdmissionBootstrapRouteBinding
  readonly source: { readonly sessionId: SessionId; readonly messageId: MessageId }
}

/** Clone-safe evidence of the one successful source-capture transfer. */
export interface AgentAdmissionBootstrapRouteClaimReceipt {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-route-claim-receipt.v6.schema.json'
  readonly contract: 'cordisx.agent-admission-bootstrap-route-claim-receipt/v6'
  readonly schemaVersion: 6
  readonly receiptId: string
  readonly owner: PluginOwnerIdentity
  readonly origin: AgentBootstrapCommandOrigin
  readonly target: AgentAdmissionBootstrapRouteTarget
  readonly binding: AgentAdmissionBootstrapRouteBinding
  readonly source: { readonly sessionId: SessionId; readonly messageId: MessageId }
}
export type AgentAdmissionBootstrapRouteClaimResult =
  | { readonly status: 'claimed'; readonly code: 'claimed'; readonly receipt: AgentAdmissionBootstrapRouteClaimReceipt }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'continuation-denied' | 'not-submitted' | 'route-unavailable' | 'route-mismatch' | 'source-mismatch' | 'binding-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'command-complete' | 'reused' | 'revoked' }
/**
 * Host-only. Invoke atomically as the declared Room route's new binding becomes
 * active, before resolving navigation or dispatching deferred scenario work.
 */
export interface AgentAdmissionBootstrapRouteClaimService {
  claim(request: AgentAdmissionBootstrapRouteClaimRequest): Promise<AgentAdmissionBootstrapRouteClaimResult>
}
