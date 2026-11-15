/** Settings selected by the user in the CordisX profile or an individual chat. */
export interface ChatExecutionSettingsV1 {
  readonly execution?: 'inherit' | 'read-only' | 'workspace-write' | 'full-access'
  readonly approval?: 'inherit' | 'untrusted' | 'on-request' | 'never'
  readonly workMode?: 'inherit' | 'default' | 'plan'
  readonly effort?: string
  readonly networkAccess?: boolean
}
export interface ChatExecutionReadbackV1 {
  readonly contract: 'cordisx.chat-execution-readback/v1'
  readonly schemaVersion: 1
  readonly profileId: string
  readonly hostGeneration: string
  readonly revision: number
  readonly scope: 'creation-defaults' | 'chat'
  readonly settings: ChatExecutionSettingsV1
  readonly application: 'saved' | 'submitted' | 'applied' | 'restricted' | 'unknown'
  /** Selected native values only; never command text, paths, credentials or native request IDs. */
  readonly effective?: ChatExecutionSettingsV1
  readonly code?: string
}
