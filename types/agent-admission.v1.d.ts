import type { AgentAdmission, AgentHandle } from './agents.v1.js'
import type { MessageId, PluginOwnerIdentity, SessionId } from './sessions.v1.js'

/** Host-generated capability for one live composer command execution. */
export interface AgentCommandOrigin {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-command-origin.v1.schema.json'
  readonly contract: 'cordisx.agent-command-origin/v1'
  readonly schemaVersion: 1
  readonly originId: string
  readonly binding: { readonly bindingId: string; readonly ownerGeneration: string }
  readonly generation: string
  readonly executionId: string
  readonly commandId: string
  readonly scope: 'composer-submit'
  readonly room: {
    readonly roomId: string
    readonly participantId: string
    readonly memberId: string
    readonly runId: string
  }
}

export interface AgentAdmissionReceipt {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-receipt.v1.schema.json'
  readonly contract: 'cordisx.agent-admission-receipt/v1'
  readonly schemaVersion: 1
  readonly receiptId: string
  readonly owner: PluginOwnerIdentity
  readonly origin: AgentCommandOrigin
  readonly sessionId: SessionId
  readonly agentGeneration: number
  readonly messageId: MessageId
}

export type AcceptedAgentAdmission = Extract<AgentAdmission, { readonly status: 'accepted' }>

export interface AgentAdmissionCaptureRequest {
  readonly handle: AgentHandle
  readonly admission: AcceptedAgentAdmission
  readonly origin: AgentCommandOrigin
}

export interface AgentAdmissionCaptureClosed {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-admission-capture-close.v1.schema.json'
  readonly contract: 'cordisx.agent-admission-capture-close/v1'
  readonly schemaVersion: 1
  readonly receiptId: string
  readonly status: 'closed'
  readonly code: 'command-complete' | 'command-replaced' | 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'disposed'
}

declare const agentAdmissionCaptureHandleCapability: unique symbol

export interface AgentAdmissionCaptureHandle {
  readonly receipt: AgentAdmissionReceipt
  readonly closed: Promise<AgentAdmissionCaptureClosed>
  readonly [agentAdmissionCaptureHandleCapability]: never
  revoke(): Promise<AgentAdmissionCaptureClosed>
}

export type AgentAdmissionCaptureResult =
  | { readonly status: 'captured'; readonly code: 'captured'; readonly handle: AgentAdmissionCaptureHandle }
  | { readonly status: 'denied'; readonly code: 'permission-denied' | 'not-owner' | 'origin-denied' }
  | { readonly status: 'conflict'; readonly code: 'message-not-admitted' | 'origin-conflict' | 'duplicate-capture' }
  | { readonly status: 'unavailable'; readonly code: 'command-complete' | 'command-replaced' | 'agent-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'host-unavailable' | 'unsupported' }

/**
 * Captures one accepted Agent mutation into the current Host command origin.
 * The receipt is ephemeral and never a SessionEvent or approval ledger fact.
 */
export interface AgentAdmissionCaptureService {
  capture(request: AgentAdmissionCaptureRequest): Promise<AgentAdmissionCaptureResult>
}
