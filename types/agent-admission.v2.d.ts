import type { AgentHandle, AgentAdmission } from './agents.v1.js'
import type { AgentCommandOrigin, AgentAdmissionReceipt } from './agent-admission.v1.js'
export interface AgentAdmissionReservationRequest { readonly handle: AgentHandle; readonly origin: AgentCommandOrigin; readonly message: { readonly text: string } }
export interface AgentAdmissionReservation { readonly reservationId: string; readonly submit: () => Promise<AgentAdmission & { readonly status: 'accepted' }>; readonly revoke: () => Promise<void> }
export type AgentAdmissionReservationResult = { readonly status: 'reserved'; readonly reservation: AgentAdmissionReservation } | { readonly status: 'denied'; readonly code: 'not-owner' | 'origin-denied' | 'stale' | 'command-complete' | 'reused' }
export interface AgentAdmissionReservationService { reserve(request: AgentAdmissionReservationRequest): Promise<AgentAdmissionReservationResult> }
export type { AgentCommandOrigin, AgentAdmissionReceipt }
