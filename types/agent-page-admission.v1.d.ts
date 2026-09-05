import type { AgentAdmission, AgentHandle } from './agents.v1.js'
import type { MessageId, PluginOwnerIdentity, SessionId } from './sessions.v1.js'

/** Host-issued identity for one mounted product page. Plugins never mint it. */
export interface AgentPageBinding {
  readonly bindingId: string
  readonly ownerGeneration: string
}

/** Exact Host route metadata for the page that owns a command execution. */
export type AgentPageRoute =
  | { readonly outlet: string; readonly routeDefinitionId: string; readonly roomId?: never }
  | { readonly outlet: string; readonly routeDefinitionId: string; readonly roomId: string }

/** Exact same-owner Room route eligible to receive a fresh page source. */
export interface AgentPageRoomRoute {
  readonly outlet: string
  readonly routeDefinitionId: string
  readonly param: 'roomId'
  readonly roomId: string
}

/**
 * Host-generated capability for one product-page composer command execution.
 * It is neither an Agent Conversation Shell origin nor a Room target.
 */
export interface AgentPageComposerOrigin {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-composer-origin.v1.schema.json'
  readonly contract: 'cordisx.agent-page-composer-origin/v1'
  readonly schemaVersion: 1
  readonly originId: string
  readonly binding: AgentPageBinding
  readonly generation: string
  readonly executionId: string
  readonly commandId: string
  readonly scope: 'page-composer-submit'
  readonly page: AgentPageRoute
}

/**
 * Host-adapter payload for exactly the page command that owns `origin`.
 * The consuming Host exposes this through its public page-command adapter
 * (for example `cordisx/contracts`), not through a second command registry.
 */
export interface AgentPageComposerCommandContext {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-composer-command-context.v1.schema.json'
  readonly contract: 'cordisx.agent-page-composer-command-context/v1'
  readonly schemaVersion: 1
  readonly binding: AgentPageBinding
  readonly generation: string
  readonly scope: 'page-composer-submit'
  readonly command: { readonly id: string }
  readonly submitPayload: string
  readonly origin: AgentPageComposerOrigin
}

/** Page-provided input to its Host-bound composer command adapter. */
export interface AgentPageComposerCommandRequest {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-composer-command-request.v1.schema.json'
  readonly contract: 'cordisx.agent-page-composer-command-request/v1'
  readonly schemaVersion: 1
  readonly command: { readonly id: string }
  readonly submitPayload: string
}

export type AgentPageComposerCommandResult =
  | { readonly status: 'accepted'; readonly code: 'dispatched' }
  | { readonly status: 'denied'; readonly code: 'command-denied' }
  | { readonly status: 'unavailable'; readonly code: 'page-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'host-unavailable' | 'unsupported' }

/**
 * New Host-owned page-prop adapter bound to one mounted page. It is absent from
 * the predecessor generic command API. `execute` causes the Host to mint the
 * matching origin and invoke the existing generic command handler with
 * `AgentPageComposerCommandContext` as its Host context.
 */
export interface AgentPageComposerCommandAdapter {
  execute(request: AgentPageComposerCommandRequest): Promise<AgentPageComposerCommandResult>
}

/** One exact Room delivery declared by the page while its command is live. */
export interface AgentPageAdmissionTarget {
  readonly roomId: string
  readonly participantId: string
  readonly memberId: string
  readonly runId: string
}

declare const pageTargetOriginCapability: unique symbol
/** Opaque, Host-issued, one-command capability for one exact page delivery. */
export interface AgentPageAdmissionTargetOrigin {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-admission-target-origin.v1.schema.json'
  readonly contract: 'cordisx.agent-page-admission-target-origin/v1'
  readonly schemaVersion: 1
  readonly token: string
  readonly [pageTargetOriginCapability]: never
}

/** Clone-safe Host receipt retained only for the originating page binding. */
export interface AgentPageAdmissionTargetReceipt {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-admission-target-receipt.v1.schema.json'
  readonly contract: 'cordisx.agent-page-admission-target-receipt/v1'
  readonly schemaVersion: 1
  readonly receiptId: string
  readonly target: AgentPageAdmissionTarget
}

export interface AgentPageAdmissionTargetRequest {
  readonly origin: AgentPageComposerOrigin
  readonly target: AgentPageAdmissionTarget
}
export type AgentPageAdmissionTargetResult =
  | { readonly status: 'issued'; readonly origin: AgentPageAdmissionTargetOrigin; readonly receipt: AgentPageAdmissionTargetReceipt }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'page-unavailable' | 'room-denied' | 'target-denied' | 'command-complete' | 'duplicate-target' | 'cross-room' | 'reused' }
/** Available only while the exact Host page command, binding, owner, and connection remain live. */
export interface AgentPageAdmissionTargetService {
  issue(request: AgentPageAdmissionTargetRequest): Promise<AgentPageAdmissionTargetResult>
}

export interface AgentPageAdmissionReservationRequest {
  readonly handle: AgentHandle
  readonly origin: AgentPageAdmissionTargetOrigin
  readonly message: { readonly text: string }
}
export interface AgentPageAdmissionReservation {
  readonly reservationId: string
  readonly submit: () => Promise<AgentAdmission & { readonly status: 'accepted' }>
  readonly revoke: () => Promise<void>
}
export type AgentPageAdmissionReservationResult =
  | { readonly status: 'reserved'; readonly reservation: AgentPageAdmissionReservation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'target-mismatch' | 'stale' | 'page-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'command-complete' | 'reused' | 'revoked' }
/** Host captures the exact handle/message before this one-shot submit invokes the driver. */
export interface AgentPageAdmissionReservationService {
  reserve(request: AgentPageAdmissionReservationRequest): Promise<AgentPageAdmissionReservationResult>
}

/** A fresh page delivery and its one exact destination Room page route. */
export interface AgentPageAdmissionRouteTarget extends AgentPageAdmissionTarget {
  readonly route: AgentPageRoomRoute
}

declare const pageRouteContinuationCapability: unique symbol
/** Opaque, command-live continuation for one fresh page delivery. */
export interface AgentPageAdmissionRouteContinuation {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-admission-route-continuation.v1.schema.json'
  readonly contract: 'cordisx.agent-page-admission-route-continuation/v1'
  readonly schemaVersion: 1
  readonly token: string
  readonly [pageRouteContinuationCapability]: never
}

export interface AgentPageAdmissionRouteDeclarationRequest {
  readonly origin: AgentPageComposerOrigin
  readonly target: AgentPageAdmissionRouteTarget
}
export type AgentPageAdmissionRouteDeclarationResult =
  | { readonly status: 'declared'; readonly continuation: AgentPageAdmissionRouteContinuation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'page-unavailable' | 'room-denied' | 'route-denied' | 'target-denied' | 'command-complete' | 'duplicate-target' | 'cross-room' | 'reused' }
/** Plugin-facing fresh-Room declaration. A plugin never claims the destination binding. */
export interface AgentPageAdmissionRouteDeclarationService {
  declare(request: AgentPageAdmissionRouteDeclarationRequest): Promise<AgentPageAdmissionRouteDeclarationResult>
}

export interface AgentPageAdmissionRouteReservationRequest {
  readonly handle: AgentHandle
  readonly continuation: AgentPageAdmissionRouteContinuation
  readonly message: { readonly text: string }
}
export interface AgentPageAdmissionRouteReservation {
  readonly reservationId: string
  readonly submit: () => Promise<AgentAdmission & { readonly status: 'accepted' }>
  readonly revoke: () => Promise<void>
}
export type AgentPageAdmissionRouteReservationResult =
  | { readonly status: 'reserved'; readonly reservation: AgentPageAdmissionRouteReservation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'target-mismatch' | 'page-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'command-complete' | 'reused' | 'revoked' }
/** Host prepares the exact source only on accepted submit; no ordinary-send fallback exists. */
export interface AgentPageAdmissionRouteReservationService {
  reserve(request: AgentPageAdmissionRouteReservationRequest): Promise<AgentPageAdmissionRouteReservationResult>
}

/** Host-generated destination binding. Plugins never construct this value. */
export interface AgentPageAdmissionRouteBinding {
  readonly binding: AgentPageBinding
  readonly generation: string
  readonly route: AgentPageRoomRoute
}

/** Host-only exact source move at destination Room-page activation. */
export interface AgentPageAdmissionRouteClaimRequest {
  readonly continuation: AgentPageAdmissionRouteContinuation
  readonly binding: AgentPageAdmissionRouteBinding
  readonly source: { readonly sessionId: SessionId; readonly messageId: MessageId }
}

/** Clone-safe evidence of the one successful fresh-page source transfer. */
export interface AgentPageAdmissionRouteClaimReceipt {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-admission-route-claim-receipt.v1.schema.json'
  readonly contract: 'cordisx.agent-page-admission-route-claim-receipt/v1'
  readonly schemaVersion: 1
  readonly receiptId: string
  readonly owner: PluginOwnerIdentity
  readonly origin: AgentPageComposerOrigin
  readonly target: AgentPageAdmissionRouteTarget
  readonly binding: AgentPageAdmissionRouteBinding
  readonly source: { readonly sessionId: SessionId; readonly messageId: MessageId }
}
export type AgentPageAdmissionRouteClaimResult =
  | { readonly status: 'claimed'; readonly code: 'claimed'; readonly receipt: AgentPageAdmissionRouteClaimReceipt }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'continuation-denied' | 'not-submitted' | 'route-unavailable' | 'route-mismatch' | 'source-mismatch' | 'page-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'command-complete' | 'reused' | 'revoked' }
/**
 * Host-only. Claim atomically as the declared same-owner Room page binding
 * activates, before navigation resolves or deferred scenario work starts.
 */
export interface AgentPageAdmissionRouteClaimService {
  claim(request: AgentPageAdmissionRouteClaimRequest): Promise<AgentPageAdmissionRouteClaimResult>
}
