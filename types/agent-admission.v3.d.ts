import type { AgentAdmission, AgentHandle } from './agents.v1.js'
import type { AgentCommandOrigin } from './agent-admission.v1.js'

/** Room-local target identity; it is not an Agent or Session identity. */
export interface AgentAdmissionTarget {
  readonly participantId: string
  readonly memberId: string
  readonly runId: string
}

declare const targetOriginCapability: unique symbol
/** Opaque, Host-issued, one-command capability for exactly one room target. */
export interface AgentAdmissionTargetOrigin {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-target-origin.v3.schema.json'
  readonly contract: 'cordisx.agent-admission-target-origin/v3'
  readonly schemaVersion: 3
  readonly token: string
  readonly [targetOriginCapability]: never
}

export interface AgentAdmissionTargetOriginRequest {
  readonly origin: AgentCommandOrigin
  readonly target: AgentAdmissionTarget
}
export type AgentAdmissionTargetOriginResult =
  | { readonly status: 'issued'; readonly origin: AgentAdmissionTargetOrigin }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'target-denied' | 'command-complete' | 'reused' }
export interface AgentAdmissionTargetOriginService {
  issue(request: AgentAdmissionTargetOriginRequest): Promise<AgentAdmissionTargetOriginResult>
}

export interface AgentAdmissionTargetReservationRequest {
  readonly handle: AgentHandle
  readonly origin: AgentAdmissionTargetOrigin
  readonly message: { readonly text: string }
}
export interface AgentAdmissionTargetReservation {
  readonly reservationId: string
  readonly submit: () => Promise<AgentAdmission & { readonly status: 'accepted' }>
  readonly revoke: () => Promise<void>
}
export type AgentAdmissionTargetReservationResult =
  | { readonly status: 'reserved'; readonly reservation: AgentAdmissionTargetReservation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'target-mismatch' | 'stale' | 'command-complete' | 'reused' }
export interface AgentAdmissionTargetReservationService {
  reserve(request: AgentAdmissionTargetReservationRequest): Promise<AgentAdmissionTargetReservationResult>
}
