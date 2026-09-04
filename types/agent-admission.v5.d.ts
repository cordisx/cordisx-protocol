import type { AgentAdmission, AgentHandle } from './agents.v1.js'
import type { AgentBootstrapCommandOrigin } from './agent-admission.v4.js'

/** Exact Room delivery declared after bootstrap and before its first Agent Session. */
export interface AgentAdmissionBootstrapRoomTarget {
  readonly roomId: string
  readonly participantId: string
  readonly memberId: string
  readonly runId: string
}

declare const bootstrapRoomTargetOriginCapability: unique symbol
/** Opaque Host receipt carrying the committed Room authority for one target. */
export interface AgentAdmissionBootstrapRoomTargetOrigin {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-room-target-origin.v5.schema.json'
  readonly contract: 'cordisx.agent-admission-bootstrap-room-target-origin/v5'
  readonly schemaVersion: 5
  readonly token: string
  readonly [bootstrapRoomTargetOriginCapability]: never
}
/** Clone-safe Host record used to capture this exact Room source after reservation submit. */
export interface AgentAdmissionBootstrapRoomTargetReceipt {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-room-target-receipt.v5.schema.json'
  readonly contract: 'cordisx.agent-admission-bootstrap-room-target-receipt/v5'
  readonly schemaVersion: 5
  readonly receiptId: string
  readonly target: AgentAdmissionBootstrapRoomTarget
}
export interface AgentAdmissionBootstrapRoomTargetRequest {
  readonly origin: AgentBootstrapCommandOrigin
  readonly target: AgentAdmissionBootstrapRoomTarget
}
export type AgentAdmissionBootstrapRoomTargetResult =
  | { readonly status: 'issued'; readonly origin: AgentAdmissionBootstrapRoomTargetOrigin; readonly receipt: AgentAdmissionBootstrapRoomTargetReceipt }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'room-denied' | 'target-denied' | 'command-complete' | 'duplicate-target' | 'cross-room' | 'reused' }
export interface AgentAdmissionBootstrapRoomTargetService {
  /** Commits exact Room source authority before the target's first driver submit. */
  issue(request: AgentAdmissionBootstrapRoomTargetRequest): Promise<AgentAdmissionBootstrapRoomTargetResult>
}
export interface AgentAdmissionBootstrapRoomReservationRequest {
  readonly handle: AgentHandle
  readonly origin: AgentAdmissionBootstrapRoomTargetOrigin
  readonly message: { readonly text: string }
}
export interface AgentAdmissionBootstrapRoomReservation {
  readonly reservationId: string
  readonly submit: () => Promise<AgentAdmission & { readonly status: 'accepted' }>
  readonly revoke: () => Promise<void>
}
export type AgentAdmissionBootstrapRoomReservationResult =
  | { readonly status: 'reserved'; readonly reservation: AgentAdmissionBootstrapRoomReservation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'room-mismatch' | 'target-mismatch' | 'stale' | 'command-complete' | 'reused' }
export interface AgentAdmissionBootstrapRoomReservationService {
  reserve(request: AgentAdmissionBootstrapRoomReservationRequest): Promise<AgentAdmissionBootstrapRoomReservationResult>
}
