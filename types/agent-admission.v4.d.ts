import type { AgentAdmission, AgentHandle } from './agents.v1.js'
import type { AgentAdmissionTarget } from './agent-admission.v3.js'

/** Host-issued command capability before a Room has a target run. */
export interface AgentBootstrapCommandOrigin {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-bootstrap-command-origin.v1.schema.json'
  readonly contract: 'cordisx.agent-bootstrap-command-origin/v1'
  readonly schemaVersion: 1
  readonly originId: string
  readonly binding: { readonly bindingId: string; readonly ownerGeneration: string }
  readonly generation: string
  readonly executionId: string
  readonly commandId: string
  readonly scope: 'composer-submit'
}

declare const bootstrapTargetOriginCapability: unique symbol
/** Opaque Host continuation result for exactly one target declared in this command. */
export interface AgentAdmissionBootstrapTargetOrigin {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-bootstrap-target-origin.v4.schema.json'
  readonly contract: 'cordisx.agent-admission-bootstrap-target-origin/v4'
  readonly schemaVersion: 4
  readonly token: string
  readonly [bootstrapTargetOriginCapability]: never
}

export interface AgentAdmissionBootstrapTargetRequest {
  readonly origin: AgentBootstrapCommandOrigin
  readonly target: AgentAdmissionTarget
}
export type AgentAdmissionBootstrapTargetResult =
  | { readonly status: 'issued'; readonly origin: AgentAdmissionBootstrapTargetOrigin }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'target-denied' | 'command-complete' | 'duplicate-target' | 'reused' }
export interface AgentAdmissionBootstrapTargetService {
  /** Declares one newly materialized Room target to the still-live Host command. */
  issue(request: AgentAdmissionBootstrapTargetRequest): Promise<AgentAdmissionBootstrapTargetResult>
}

export interface AgentAdmissionBootstrapReservationRequest {
  readonly handle: AgentHandle
  readonly origin: AgentAdmissionBootstrapTargetOrigin
  readonly message: { readonly text: string }
}
export interface AgentAdmissionBootstrapReservation {
  readonly reservationId: string
  readonly submit: () => Promise<AgentAdmission & { readonly status: 'accepted' }>
  readonly revoke: () => Promise<void>
}
export type AgentAdmissionBootstrapReservationResult =
  | { readonly status: 'reserved'; readonly reservation: AgentAdmissionBootstrapReservation }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'target-mismatch' | 'stale' | 'command-complete' | 'reused' }
export interface AgentAdmissionBootstrapReservationService {
  reserve(request: AgentAdmissionBootstrapReservationRequest): Promise<AgentAdmissionBootstrapReservationResult>
}
