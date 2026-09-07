import type { AgentDefinitionIdentity } from './agents.v1.js'
import type { ApprovalAgentBinding } from './approval.v2.js'
import type { PluginOwnerIdentity, SessionId } from './sessions.v1.js'
import type { PluginApprovalCapabilityDeclarationV6, PluginManifestHostRouteSessionScopeBindingV6, PluginManifestApprovalAuthorityRequesterRouteScopeV8 } from './plugin-manifest.v8.js'

/** Manifest maximum scope; only Host-verified durable required tasks of this command qualify. */
export interface AgentTaskCommandScopeV1 {
  readonly kind: 'agent-task-command'
  readonly commandId: string
}
type ApprovalMetadataV1 = Pick<PluginApprovalCapabilityDeclarationV6, 'rationale' | 'security'>
export type AgentTaskRequestCapabilityV1 = ApprovalMetadataV1 & {
  readonly name: 'approvals.request'
  readonly required: false
  readonly scope: {
    readonly task: AgentTaskCommandScopeV1
    /** Independent existing route source; never fallback for a revoked task source. */
    readonly sessionIds?: PluginManifestHostRouteSessionScopeBindingV6
  }
}
export type AgentTaskAnswerCapabilityV1 = ApprovalMetadataV1 & {
  readonly name: 'approvals.answer'
  readonly required: false
  readonly scope: {
    readonly taskRequester: AgentTaskCommandScopeV1
    /** Independent v8 correlation branch, with all of its existing checks. */
    readonly authorityRequester?: PluginManifestApprovalAuthorityRequesterRouteScopeV8['authorityRequester']
  }
}

/** Host-only evidence projection. Structural validity is not a grant or proof of provenance. */
export interface AgentTaskPermissionSourceV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-task-permission-source.v1.schema.json'
  readonly contract: 'cordisx.agent-task-permission-source/v1'
  readonly schemaVersion: 1
  readonly kind: 'host-agent-task'
  readonly owner: PluginOwnerIdentity
  readonly operationId: string
  readonly commandId: string
  readonly sessionId: SessionId
  readonly definition: AgentDefinitionIdentity
  /** Current agent-task-binding/v1 required-handler registration, not a v3 resolver id. */
  readonly taskRegistrationId: string
  readonly connectionGeneration: number
}

/** Host-only bounded lease after actual accepted v3 routing and permission policy checks. */
export interface AgentTaskApprovalAuthorityLeaseV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-task-approval-authority-lease.v1.schema.json'
  readonly contract: 'cordisx.agent-task-approval-authority-lease/v1'
  readonly schemaVersion: 1
  readonly leaseId: string
  readonly taskSource: AgentTaskPermissionSourceV1
  readonly routingId: string
  /** Actual approval/v3 resolver registration; distinct from taskSource.taskRegistrationId. */
  readonly registrationId: string
  readonly requester: ApprovalAgentBinding
  readonly authority: ApprovalAgentBinding
}
